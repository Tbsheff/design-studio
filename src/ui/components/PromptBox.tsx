import { useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { CompiledTokenEntry, ComponentInfo, Project, ProjectSettings, QueuedMessage, RunEffort, RunLevel, RunMention, RunMode, SelectionContext } from '../../shared/contracts';
import { MentionChips, MentionList } from './MentionPicker';
import { useMentions, type MentionRequest } from '../useMentions';
import { HistorySearch, useHistorySearch } from './HistorySearch';
import { ContextMeter } from './ContextMeter';
import { QueuedMessages } from './QueuedMessages';
import { useComposerKeys } from '../useComposerKeys';
import { Composer, ComposerInput, ComposerSubmit, ComposerToolbar, ComposerToolbarSpacer } from '../ai/components/ai/composer';
import { api, errorText } from '../api';
import { AttachmentThumbs, SelectionChips, type PendingAttachment } from './ComposerParts';
import { LevelPill, ModelPill, PlusMenu } from './ComposerMenu';
import { Disclosure } from './Disclosure';
import { Icon, type IconName } from './Icon';
import { MOD_LABEL } from './CommentPopover';
import { MODE_LABEL, type ComposerMode } from './RunSettings';
import { SkillChips, SkillPicker, SkillsIndicator } from './SkillPicker';
import { skillInstruction } from '../skills';
import { useRunLevel } from '../useRunLevel';
import { useDesktopCommand } from '../desktop';
import { useDraft, type DraftStore } from '../storage';
import { useCommands, type Command } from '../commands/registry';
import { composerCommands, isModeCycleKey, nextMode, slashCommands } from '../commands/composerCommands';

interface Props {
  projectId: string;
  model: string;
  settings: ProjectSettings;
  onSettingsSaved: (project: Project) => void;
  draft: DraftStore;
  selection: SelectionContext[];
  onRemoveSelection: (selector: string) => void;
  running: boolean;
  disabled: boolean;
  onSend: (prompt: string, mode: ComposerMode, attachmentIds: string[], level: RunLevel, effort: RunEffort | null, mentions: RunMention[]) => Promise<void>;
  onCancel: () => void;
  variations?: VariationsPromptProps;
  queued?: boolean;
  queue?: QueuedMessage[];
  onQueueChange?: (items: QueuedMessage[]) => void;
  onSteer?: (text: string) => void;
  history?: string[];
  contextTokens?: number | null;
  directionId?: string | null;
  tokens?: CompiledTokenEntry[];
  components?: ComponentInfo[] | null;
  mentionRequest?: MentionRequest | null;
}

interface VariationsPromptProps {
  count: number;
  max: number;
  onCount: (count: number) => void;
  onSend: (prompt: string, level: RunLevel, attachmentIds: string[]) => Promise<void>;
}

function StopButton({ running, onStop }: { running: boolean; onStop: () => void }) {
  if (!running) return null;
  return (
    <button type="button" className="icon-btn small bordered stop-btn" onClick={onStop} aria-label="Stop" aria-keyshortcuts="Escape" data-tip="Stop (Esc)" data-tip-align="end">
      <Icon name="stop" size={14} />
    </button>
  );
}

function SendButton(props: { running: boolean; sending: boolean; canSend: boolean; canQueue: boolean; onQueue: () => void }) {
  if (props.running) {
    return (
      <button
        type="button"
        className="btn send send-btn"
        disabled={!props.canQueue}
        onClick={props.onQueue}
        aria-label="Queue"
        data-tip={`Queue (↵) · Send now (${MOD_LABEL}↵)`}
        data-tip-align="end"
      >
        Queue
      </button>
    );
  }
  return (
    <ComposerSubmit
      disabled={!props.canSend}
      aria-label={props.sending ? 'Sending…' : 'Send'}
      data-tip={`${MOD_LABEL}Enter`}
      data-tip-align="end"
      render={<button className="btn send send-btn" />}
    >
      {props.sending ? <span className="spinner" /> : 'Send'}
    </ComposerSubmit>
  );
}

function StateChip({ label, short, tip, onClear }: { label: string; short: ReactNode; tip: string; onClear: () => void }) {
  return (
    <span className="ui-chip composer-state" data-tip={tip} data-tip-side="top" data-tip-align="start">
      <span className="composer-state-short" aria-hidden="true">
        {short}
      </span>
      <span className="composer-state-label">{label}</span>
      <button type="button" className="icon-btn chip-x" aria-label={`Clear ${label}`} onClick={onClear}>
        <Icon name="close" size={12} />
      </button>
    </span>
  );
}

const MODE_ICON: Record<ComposerMode, IconName> = { edit: 'pencil', plan: 'doc', critique: 'eye' };

const INPUT_COPY: Record<ComposerMode, { label: string; placeholder: string }> = {
  edit: { label: 'Describe what you want to create', placeholder: 'Describe what you want to create...' },
  plan: { label: 'Describe what to plan', placeholder: 'Describe what to plan...' },
  critique: { label: 'Ask for a critique', placeholder: 'Ask for a critique...' },
};

function designsBlocker(mode: ComposerMode, selectionCount: number): string | null {
  if (mode === 'critique') return 'Critique makes one review.';
  if (mode === 'plan') return 'Plan makes one plan.';
  if (selectionCount > 0) return 'Variations need an empty selection.';
  return null;
}

export function PromptBox(props: Props) {
  const [mode, setMode] = useState<ComposerMode>('edit');
  const [effort, setEffort] = useState<RunEffort | null>(null);
  const [files, setFiles] = useState<PendingAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const runLevel = useRunLevel(props.projectId, props.settings.defaultLevel, props.onSettingsSaved);
  const draft = useDraft(props.draft);
  const setDraft = props.draft.set;

  const closePicker = () => {
    setPicking(false);
    window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.prompt textarea')?.focus());
  };
  const focusInput = () => window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.prompt [data-slot="composer-input"]')?.focus());
  useCommands(() => composerCommands({ mode, setMode, level: runLevel.level, setLevel: runLevel.choose, variations: props.variations, focus: focusInput }));
  const runSlash = (command: Command) => {
    setPicking(false);
    command.run();
  };
  const pickSkill = (id: string) => {
    setSkillIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    closePicker();
  };
  const onDraft = (value: string) => {
    if (value === '/' && draft === '') {
      setPicking(true);
      return;
    }
    setDraft(value);
  };

  const addFiles = (list: Iterable<File>) => {
    for (const file of list) {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image. Attach a PNG, JPEG, GIF or WebP file.`);
        continue;
      }
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      setFiles((prev) => [...prev, { localId, name: file.name, previewUrl, attachment: null, error: null }]);
      api
        .uploadAttachment(props.projectId, file)
        .then((attachment) => setFiles((prev) => prev.map((f) => (f.localId === localId ? { ...f, attachment } : f))))
        .catch((err) =>
          setFiles((prev) => prev.map((f) => (f.localId === localId ? { ...f, error: errorText(err) } : f))),
        );
    }
  };

  const removeFile = (localId: string) =>
    setFiles((prev) => {
      const f = prev.find((x) => x.localId === localId);
      if (f) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.localId !== localId);
    });

  const chooseModel = (model: string) => {
    if (model === props.model) return;
    setError(null);
    api
      .updateSettings(props.projectId, { model })
      .then(props.onSettingsSaved)
      .catch((err: unknown) => setError(`Could not save the model: ${errorText(err)}`));
  };
  const insertMention = () => {
    setPicking(false);
    setDraft(draft === '' || /\s$/.test(draft) ? `${draft}@` : `${draft} @`);
    focusInput();
  };
  const designs = props.variations && {
    value: props.variations.count,
    max: props.variations.max,
    onChange: props.variations.onCount,
    disabledReason: designsBlocker(mode, props.selection.length),
  };

  const uploading = files.some((f) => !f.attachment && !f.error);
  const mentions = useMentions({ projectId: props.projectId, directionId: props.directionId, tokens: props.tokens, draft, setDraft, components: props.components, request: props.mentionRequest });
  const historySearch = useHistorySearch(props.history ?? []);
  const onKeyCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    const inInput = (event.target as HTMLElement).matches('[data-slot="composer-input"]');
    if (inInput && event.ctrlKey && !event.metaKey && event.key === 'r') {
      event.preventDefault();
      historySearch.start();
      return;
    }
    if (inInput && mentions.onKeyDown(event)) return;
    if (inInput && isModeCycleKey(event)) {
      event.preventDefault();
      setMode(nextMode(mode));
      return;
    }
    keys.onKeyDown(event);
  };
  const keys = useComposerKeys({ draft, setDraft, blocked: files.length > 0, running: props.running, queue: props.queue, history: props.history, onQueueChange: props.onQueueChange, onSteer: props.onSteer });
  const canSend = !props.running && !props.disabled && !sending && !uploading && (draft.trim().length > 0 || skillIds.length > 0);

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    const sentDraft = draft;
    try {
      const ids = files.flatMap((f) => (f.attachment ? [f.attachment.id] : []));
      const prompt = [draft.trim(), skillInstruction(skillIds)].filter(Boolean).join('\n\n');
      const fanOut = mode === 'edit' && props.variations && props.variations.count > 1 && props.selection.length === 0;
      const sent = fanOut && props.variations ? props.variations.onSend(prompt, runLevel.level, ids) : props.onSend(prompt, mode, ids, runLevel.level, effort, mentions.mentions);
      setDraft('');
      await sent;
      mentions.clear();
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setFiles([]);
      setSkillIds([]);
      keys.resetHistory();
    } catch (err) {
      if (!props.draft.get().trim()) setDraft(sentDraft);
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  };

  useDesktopCommand((command) => {
    if (command.type === 'run') {
      if (canSend) void send();
      else document.querySelector<HTMLTextAreaElement>('.prompt textarea')?.focus();
      return true;
    }
    if (command.type === 'stop') {
      if (props.running) props.onCancel();
      return true;
    }
    return false;
  });

  const onPaste = (e: ClipboardEvent) => {
    const images = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (images.length > 0) {
      e.preventDefault();
      addFiles(images);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      className={`prompt ${dragging ? 'dragging' : ''}`}
      data-ai-scope=""
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onKeyDownCapture={onKeyCapture}
    >
      {files
        .filter((f) => f.error)
        .map((f) => (
          <div key={f.localId} className="alert error" role="alert">
            {f.name}: {f.error}
          </div>
        ))}
      {error && <div className="alert error">{error}</div>}
      {runLevel.error && <div className="alert error">{runLevel.error}</div>}
      <QueuedMessages items={keys.queue} onChange={keys.setQueue} />
      <HistorySearch
        search={historySearch}
        onPick={(prompt) => {
          historySearch.close();
          setDraft(prompt);
          window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.prompt [data-slot="composer-input"]')?.focus());
        }}
      />
      {mentions.picker.open && <MentionList shown={mentions.picker.shown} current={mentions.picker.current} loading={mentions.loading} onPick={mentions.pick} onHover={mentions.picker.setActive} />}
      {picking && <SkillPicker disabled={props.settings.disabledSkills ?? []} exclude={skillIds} onPick={pickSkill} onClose={closePicker} commands={slashCommands()} onCommand={runSlash} />}
      <Composer
        className={`composer ui-composer cursor-text ${dragging ? 'dragging' : ''}`}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.querySelector('textarea')?.focus()}
      >
        <SelectionChips selection={props.selection} onRemove={props.onRemoveSelection} />
        <AttachmentThumbs files={files} onRemove={removeFile} />
        <MentionChips mentions={mentions.mentions} onRemove={mentions.remove} />
        <SkillChips ids={skillIds} onRemove={(id) => setSkillIds((prev) => prev.filter((x) => x !== id))} />
        <ComposerInput
          className="composer-input min-h-16"
          value={draft}
          aria-label={INPUT_COPY[mode].label}
          placeholder={INPUT_COPY[mode].placeholder}
          maxRows={9}
          submitOnEnter={false}
          onValueChange={(value) => {
            keys.resetHistory();
            onDraft(value);
          }}
          onSubmit={() => void send()}
          onPaste={onPaste}
        />
        <ComposerToolbar className="prompt-bar cursor-default gap-1 px-2 pt-0 pb-2">
          <PlusMenu
            onAttach={() => inputRef.current?.click()}
            onMention={insertMention}
            onSkills={() => setPicking(true)}
            onOpen={() => setPicking(false)}
            mode={mode}
            onMode={setMode}
            designs={designs}
          />
          {mode !== 'edit' && <StateChip label={MODE_LABEL[mode]} short={<Icon name={MODE_ICON[mode]} size={14} />} tip={`${MODE_LABEL[mode]} mode. Shift+Tab cycles modes.`} onClear={() => setMode('edit')} />}
          {designs && designs.value > 1 && designs.disabledReason === null && <StateChip label={`${designs.value} designs`} short={`${designs.value}×`} tip={`Send makes ${designs.value} designs side by side.`} onClear={() => designs.onChange(1)} />}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(Array.from(e.target.files));
              e.target.value = '';
            }}
          />
          <ComposerToolbarSpacer className="prompt-send gap-1">
            <LevelPill level={runLevel.level} onLevel={runLevel.choose} onOpen={() => setPicking(false)} />
            <ModelPill model={props.model} level={runLevel.level} effort={{ value: effort, onChange: setEffort }} onModel={chooseModel} onOpen={() => setPicking(false)} />
            <StopButton running={props.running} onStop={props.onCancel} />
            <SendButton running={props.running} sending={sending} canSend={canSend} canQueue={keys.canQueue} onQueue={keys.queueDraft} />
          </ComposerToolbarSpacer>
        </ComposerToolbar>
      </Composer>
      <Disclosure
        className="prompt-foot"
        lead={<SkillsIndicator projectId={props.projectId} settings={props.settings} onSaved={props.onSettingsSaved} />}
        trail={<ContextMeter tokens={props.contextTokens ?? null} model={props.model} />}
      />
    </div>
  );
}
