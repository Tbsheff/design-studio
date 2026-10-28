import { useId, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { CompiledTokenEntry, ComponentInfo, Project, ProjectSettings, QueuedMessage, RunEffort, RunLevel, RunMention, RunMode, SelectionContext } from '../../shared/contracts';
import { elementVariantsIntent } from '../../shared/element-variants';
import { MentionChips, MentionList } from './MentionPicker';
import { useMentions, type MentionRequest } from '../useMentions';
import { HistorySearch, useHistorySearch } from './HistorySearch';
import { ContextMeter } from './ContextMeter';
import { QueuedMessages } from './QueuedMessages';
import { useComposerKeys } from '../useComposerKeys';
import { Composer, ComposerInput, ComposerToolbar, ComposerToolbarSpacer } from '../ai/components/ai/composer';
import { api, errorText } from '../api';
import { AttachmentThumbs, SelectionChips, type PendingAttachment } from './ComposerParts';
import { ComposerAlert, MAX_IMAGES, imageProblem } from './HomeComposerParts';
import { LevelPill, MODE_SHORT_HINT, ModelPill, PlusMenu } from './ComposerMenu';
import { Disclosure } from './Disclosure';
import { Icon, type IconName } from './Icon';
import { MOD_LABEL } from './CommentPopover';
import { MODE_LABEL, type ComposerMode } from './RunSettings';
import { SkillChips, SkillsIndicator, useSlashSections } from './SkillPicker';
import { SlashMenu, useSlashMenu, type SlashGroup } from './SlashMenu';
import { effortGroup, levelGroup, modelGroup } from './slashGroups';
import { skillInstruction } from '../skills';
import { useRunLevel } from '../useRunLevel';
import { useDesktopCommand } from '../desktop';
import { useDraft, type DraftStore } from '../storage';
import { useCommands, type Command } from '../commands/registry';
import { composerCommands, isModeCycleKey, nextMode, slashCommands } from '../commands/composerCommands';
import { IS_MAC } from '../commands/keys';
import { shortcutLabel } from '../../shared/keymap';

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
  waitReason?: string | null;
}

interface VariationsPromptProps {
  count: number;
  max: number;
  onCount: (count: number) => void;
  onSend: (prompt: string, level: RunLevel, attachmentIds: string[]) => Promise<void>;
  onElement?: (prompt: string, count: number, level: RunLevel) => Promise<void>;
}

type SendState = 'send' | 'queue' | 'stop';

const SEND_LABEL: Record<SendState, string> = { send: 'Send', queue: 'Queue', stop: 'Stop' };

function useMorph(key: string): boolean {
  const last = useRef<string | null>(null);
  const morphed = useRef(false);
  if (last.current !== key) {
    morphed.current = last.current !== null;
    last.current = key;
  }
  return morphed.current;
}

interface SendProps {
  running: boolean;
  sending: boolean;
  canSend: boolean;
  canQueue: boolean;
  hasDraft: boolean;
  tip: string;
  onSend: () => void;
  onQueue: () => void;
  onStop: () => void;
}

interface SendView {
  state: SendState;
  busy: boolean;
  disabled: boolean;
  tip: string;
  keys?: string;
  onClick: () => void;
}

const QUEUE_TIP = `Queue (↵) · Send now (${MOD_LABEL}↵) · Stop (Esc)`;
const SEND_CLASS: Record<SendState, string> = { send: 'btn send send-btn', queue: 'btn send send-btn', stop: 'btn send-btn stop-btn' };

function sendView(props: SendProps): SendView {
  if (props.running && !props.hasDraft) return { state: 'stop', busy: false, disabled: false, tip: 'Stop (Esc)', keys: 'Escape', onClick: props.onStop };
  if (props.running) return { state: 'queue', busy: false, disabled: !props.canQueue, tip: QUEUE_TIP, onClick: props.onQueue };
  return { state: 'send', busy: props.sending, disabled: !props.canSend, tip: props.tip, onClick: props.onSend };
}

function SendButton(props: SendProps) {
  const view = sendView(props);
  const key = view.busy ? 'busy' : view.state;
  const morph = useMorph(key);
  return (
    <button
      type="button"
      className={SEND_CLASS[view.state]}
      data-state={key}
      disabled={view.disabled}
      onClick={view.onClick}
      aria-label={view.busy ? 'Sending…' : SEND_LABEL[view.state]}
      aria-busy={view.busy || undefined}
      aria-keyshortcuts={view.keys}
      data-tip={view.tip}
      data-tip-align="end"
      data-tip-side="top"
    >
      <span key={key} className={morph ? 'send-label morph' : 'send-label'}>
        {view.state === 'stop' && <Icon name="stop" size={12} />}
        {view.busy ? <span className="spinner" /> : SEND_LABEL[view.state]}
      </span>
    </button>
  );
}

function ReasonText({ id, text }: { id: string; text: string | null }) {
  if (!text) return null;
  return (
    <span id={id} className="sr-only">
      {text}
    </span>
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
const MODES: readonly ComposerMode[] = ['edit', 'plan', 'critique'];

function modeGroup(mode: ComposerMode, onMode: (mode: ComposerMode) => void): SlashGroup {
  return { id: 'mode', label: 'Mode', icon: 'chat', value: MODE_LABEL[mode], choices: MODES.map((item) => ({ id: item, label: MODE_LABEL[item], icon: MODE_ICON[item], hint: MODE_SHORT_HINT[item], checked: item === mode, pick: () => onMode(item) })) };
}

const SLASH_HIDDEN = /^composer\.(mode|level)-/;

const INPUT_COPY: Record<ComposerMode, { label: string; placeholder: string }> = {
  edit: { label: 'Describe what you want to create', placeholder: 'Describe what you want to create…' },
  plan: { label: 'Describe what to plan', placeholder: 'Describe what to plan…' },
  critique: { label: 'Ask for a critique', placeholder: 'Ask for a critique…' },
};

const RUNNING_PLACEHOLDER = `Queue a note (↵) or send it now (${MOD_LABEL}↵)`;

function sendReady(state: { running: boolean; blocked: boolean; busy: boolean; empty: boolean }): boolean {
  return !state.running && !state.blocked && !state.busy && !state.empty;
}

function inputPlaceholder(mode: ComposerMode, running: boolean, waitReason: string | null | undefined): string {
  if (waitReason) return waitReason;
  return running ? RUNNING_PLACEHOLDER : INPUT_COPY[mode].placeholder;
}

const EMPTY_REASON = 'Type a message to send';

interface SendStatus {
  tip: string;
  spoken: string | null;
}

function sendStatus(state: { running: boolean; waitReason: string | null | undefined; loading: boolean; uploading: boolean; empty: boolean }): SendStatus {
  const blocker = state.running ? null : sendBlocker(state);
  return { tip: blocker ?? `Send (${MOD_LABEL}↵)`, spoken: blocker === EMPTY_REASON ? null : blocker };
}

function sendBlocker(state: { waitReason: string | null | undefined; loading: boolean; uploading: boolean; empty: boolean }): string | null {
  if (state.waitReason) return state.waitReason;
  if (state.loading) return 'Wait for the design to load';
  if (state.uploading) return 'Wait for the images to upload';
  if (state.empty) return EMPTY_REASON;
  return null;
}

function sendErrorText(err: unknown): string {
  if (err instanceof TypeError) return 'Could not reach the studio. Your message is still here. Check that the studio runs, then send again.';
  return errorText(err);
}

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
  const reasonId = useId();
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const runLevel = useRunLevel(props.projectId, props.settings.defaultLevel, props.onSettingsSaved);
  const draft = useDraft(props.draft);
  const setDraft = props.draft.set;

  const focusInput = () => window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.prompt [data-slot="composer-input"]')?.focus());
  useCommands(() => composerCommands({ mode, setMode, level: runLevel.level, setLevel: runLevel.choose, variations: props.variations, focus: focusInput }));
  const slashSource = useSlashSections({
    disabled: props.settings.disabledSkills ?? [],
    exclude: skillIds,
    commands: slashCommands().filter((command) => !SLASH_HIDDEN.test(command.id)),
    onSkill: (id) => setSkillIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    onCommand: (command: Command) => command.run(),
  });

  const addFiles = (list: Iterable<File>) => {
    let room = MAX_IMAGES - files.length;
    const problems = new Set<string>();
    for (const file of list) {
      const problem = imageProblem(file) ?? (room <= 0 ? `You can attach up to ${MAX_IMAGES} images.` : null);
      if (problem) {
        problems.add(problem);
        continue;
      }
      room -= 1;
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
    if (problems.size > 0) setError([...problems].join(' '));
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
  const slash = useSlashMenu({
    draft,
    setDraft,
    groups: [levelGroup(runLevel.level, runLevel.choose), modelGroup(props.model, runLevel.level, chooseModel), effortGroup(effort, setEffort), modeGroup(mode, setMode)],
    sections: slashSource.sections,
    note: slashSource.note,
    label: 'Settings, commands and skills',
  });
  const promptRef = useRef<HTMLDivElement>(null);
  const insertMention = () => {
    slash.close();
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
    if (inInput && (slash.onKeyDown(event) || mentions.onKeyDown(event))) return;
    if (inInput && isModeCycleKey(event)) {
      event.preventDefault();
      setMode(nextMode(mode));
      return;
    }
    keys.onKeyDown(event);
  };
  const keys = useComposerKeys({ draft, setDraft, blocked: files.length > 0, running: props.running, queue: props.queue, history: props.history, onQueueChange: props.onQueueChange, onSteer: props.onSteer });
  const emptyDraft = draft.trim() === '' && skillIds.length === 0;
  const status = sendStatus({ running: props.running, waitReason: props.waitReason, loading: props.disabled, uploading, empty: emptyDraft });
  const canSend = sendReady({ running: props.running, blocked: props.disabled || Boolean(props.waitReason), busy: sending || uploading, empty: emptyDraft });

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    const sentDraft = draft;
    try {
      const ids = files.flatMap((f) => (f.attachment ? [f.attachment.id] : []));
      const prompt = [draft.trim(), skillInstruction(skillIds)].filter(Boolean).join('\n\n');
      const fanOut = mode === 'edit' && props.variations && props.variations.count > 1 && props.selection.length === 0;
      const elementCount = mode === 'edit' && props.selection.length === 1 ? elementVariantsIntent(prompt) : null;
      const onElement = props.variations?.onElement;
      const sent =
        elementCount && onElement
          ? onElement(prompt, elementCount, runLevel.level)
          : fanOut && props.variations
            ? props.variations.onSend(prompt, runLevel.level, ids)
            : props.onSend(prompt, mode, ids, runLevel.level, effort, mentions.mentions);
      setDraft('');
      await sent;
      mentions.clear();
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setFiles([]);
      setSkillIds([]);
      keys.resetHistory();
    } catch (err) {
      if (!props.draft.get().trim()) setDraft(sentDraft);
      setError(sendErrorText(err));
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
      ref={promptRef}
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
          <ComposerAlert key={f.localId} onClose={() => removeFile(f.localId)}>
            {f.name}: {f.error}
          </ComposerAlert>
        ))}
      {error && <ComposerAlert onClose={() => setError(null)}>{error}</ComposerAlert>}
      {runLevel.error && <ComposerAlert onClose={runLevel.clearError}>{runLevel.error}</ComposerAlert>}
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
      {slash.open && <SlashMenu view={slash.view} anchor={() => promptRef.current?.querySelector<HTMLElement>('.composer') ?? null} input={() => promptRef.current?.querySelector<HTMLElement>('[data-slot="composer-input"]') ?? null} onClose={slash.close} />}
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
          placeholder={inputPlaceholder(mode, props.running, props.waitReason)}
          maxRows={9}
          submitOnEnter={false}
          aria-describedby={status.spoken ? reasonId : undefined}
          {...slash.inputProps}
          onValueChange={(value) => {
            keys.resetHistory();
            setDraft(value);
          }}
          onSubmit={() => void send()}
          onPaste={onPaste}
        />
        <ComposerToolbar className="prompt-bar cursor-default gap-1 px-2 pt-0 pb-2">
          <PlusMenu
            onAttach={() => inputRef.current?.click()}
            onMention={insertMention}
            onSkills={() => {
              slash.openMenu();
              focusInput();
            }}
            onOpen={slash.close}
            mode={mode}
            onMode={setMode}
            designs={designs}
          />
          {mode !== 'edit' && <StateChip label={MODE_LABEL[mode]} short={<Icon name={MODE_ICON[mode]} size={14} />} tip={`${MODE_LABEL[mode]} mode. ${shortcutLabel('composer-mode', IS_MAC)} cycles modes.`} onClear={() => setMode('edit')} />}
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
            <LevelPill level={runLevel.level} onLevel={runLevel.choose} onOpen={slash.close} />
            <ModelPill model={props.model} level={runLevel.level} effort={{ value: effort, onChange: setEffort }} onModel={chooseModel} onOpen={slash.close} />
            <SendButton
              running={props.running}
              sending={sending}
              canSend={canSend}
              canQueue={keys.canQueue}
              hasDraft={draft.trim().length > 0}
              tip={status.tip}
              onSend={() => void send()}
              onQueue={keys.queueDraft}
              onStop={() => {
                props.onCancel();
                focusInput();
              }}
            />
          </ComposerToolbarSpacer>
          <ReasonText id={reasonId} text={status.spoken} />
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
