import type {
  CompiledTokenEntry,
  ComponentInfo,
  Project,
  ProjectSettings,
  QueuedMessage,
  RunEffort,
  RunLevel,
  RunMention,
  SelectionContext,
} from "@design-studio/contracts";
import { Disclosure } from "@design-studio/ui";
import { Suspense, useId, useRef, useState } from "react";
import type { ClipboardEvent, DragEvent, ReactElement } from "react";

import { Composer, ComposerInput } from "../../ai/components/ai/composer.js";
import { composerCommands, useCommands } from "../../chat-slots.js";
import type { Command } from "../../chat-slots.js";
import { useDraft } from "../../platform/storage.js";
import type { DraftStore } from "../../platform/storage.js";
import { ComposerComments } from "../comments/composer-comments.js";
import { useCommentPrefill } from "../comments/use-comment-prefill.js";
import type { PrefillRequest } from "../comments/use-comment-prefill.js";
import {
  ComposerAlert,
  MAX_IMAGES,
  imageProblem,
} from "../home/home-composer-parts.js";
import { focusComposerInput, useComposerFocus } from "./composer-focus.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { SelectionChips, AttachmentThumbs } from "./composer-parts.js";
import { copy } from "./copy.js";
import { HistorySearch } from "./history-search.js";
import { MentionChips, MentionList } from "./mention-picker.js";
import { INPUT_COPY, RepoContextChip } from "./prompt-box-model.js";
import type { VariationsPromptProps } from "./prompt-box-model.js";
import { PromptFootTrail } from "./prompt-foot-trail.js";
import {
  addSkillId,
  designsBlocker,
  inputPlaceholder,
  modeGroup,
  sendReady,
  sendStatus,
  toDropClass,
  toSlashCommands,
} from "./prompt-send-model.js";
import { PromptToolbar } from "./prompt-toolbar.js";
import { QueuedMessages } from "./queued-messages.js";
import { RunContextChip } from "./run-context-chip.js";
import { SkillChips } from "./skill-chips.js";
import { SkillsIndicator } from "./skills-indicator.js";
import { effortGroup, levelGroup, modelGroup } from "./slash-groups.js";
import { SlashMenu, useSlashMenu } from "./slash-menu.js";
import { useComposerKeys } from "./use-composer-keys.js";
import { useHistorySearch } from "./use-history-search.js";
import { useMentions } from "./use-mentions.js";
import type { MentionRequest } from "./use-mentions.js";
import { useModelChoice } from "./use-model-choice.js";
import { usePromptDesktopCommand } from "./use-prompt-desktop-command.js";
import { usePromptFiles } from "./use-prompt-files.js";
import { usePromptKeyCapture } from "./use-prompt-key-capture.js";
import { usePromptSend } from "./use-prompt-send.js";
import type { PromptRequest } from "./use-prompt-send.js";
import type { RunCanvasChip } from "./use-run-canvas.js";
import { useRunLevel } from "./use-run-level.js";
import { useSlashSections } from "./use-slash-sections.js";

interface Props {
  projectId: string;
  model: string;
  settings: ProjectSettings;
  onSettingsSaved: (project: Project) => void;
  draft: DraftStore;
  selection: SelectionContext[];
  onRemoveSelection: (selector: string) => void;
  canvasChip?: RunCanvasChip | null;
  running: boolean;
  disabled: boolean;
  onSend: (
    prompt: string,
    mode: ComposerMode,
    attachmentIds: string[],
    level: RunLevel,
    effort: RunEffort | null,
    mentions: RunMention[],
    commentIds?: string[]
  ) => Promise<void>;
  onCancel: () => void;
  prefill?: PrefillRequest | null;
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

const FILE_RULES = {
  createPreviewUrl: (file: File): string => URL.createObjectURL(file),
  imageProblem,
  maxImages: MAX_IMAGES,
};

const PromptBox = (props: Props): ReactElement => {
  const [mode, setMode] = useState<ComposerMode>("edit");
  const [effort, setEffort] = useState<RunEffort | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const reasonId = useId();
  const promptRef = useRef<HTMLDivElement>(null);

  const runLevel = useRunLevel(
    props.projectId,
    props.settings.defaultLevel,
    props.onSettingsSaved
  );

  const draft = useDraft(props.draft);
  const setDraft = props.draft.set;

  const chooseModel = useModelChoice(
    props.projectId,
    props.model,
    props.onSettingsSaved,
    setError
  );

  const { addFiles, files, removeFile, setFiles, uploading } = usePromptFiles(
    props.projectId,
    setError,
    FILE_RULES
  );

  useComposerFocus(props.running, !props.disabled);
  useCommands(() =>
    composerCommands({
      focus: focusComposerInput,
      level: runLevel.level,
      mode,
      setLevel: runLevel.choose,
      setMode,
      variations: props.variations,
    })
  );

  const slashSource = useSlashSections({
    commands: toSlashCommands(),
    disabled: props.settings.disabledSkills ?? [],
    exclude: skillIds,
    onCommand: (command: Command) => command.run(),
    onSkill: (id) => setSkillIds((previous) => addSkillId(previous, id)),
  });

  const slash = useSlashMenu({
    draft,
    groups: [
      levelGroup(runLevel.level, runLevel.choose),
      modelGroup(props.model, runLevel.level, chooseModel),
      effortGroup(effort, setEffort),
      modeGroup(mode, setMode),
    ],
    label: "Settings, commands and skills",
    note: slashSource.note,
    sections: slashSource.sections,
    setDraft,
  });

  const designs = props.variations && {
    disabledReason: designsBlocker(mode, props.selection.length),
    max: props.variations.max,
    onChange: props.variations.onCount,
    value: props.variations.count,
  };

  const prefill = useCommentPrefill({
    draft: props.draft,
    focus: focusComposerInput,
    maxImages: MAX_IMAGES,
    request: props.prefill,
    setFiles,
  });

  const mentions = useMentions({
    components: props.components,
    directionId: props.directionId,
    draft,
    projectId: props.projectId,
    request: props.mentionRequest,
    setDraft,
    tokens: props.tokens,
  });

  const historySearch = useHistorySearch(props.history ?? []);

  const keys = useComposerKeys({
    blocked: files.length > 0,
    draft,
    history: props.history,
    onQueueChange: props.onQueueChange,
    onSteer: props.onSteer,
    queue: props.queue,
    running: props.running,
    setDraft,
  });

  const onKeyCapture = usePromptKeyCapture({
    composerKeys: keys,
    mentions,
    mode,
    onHistorySearch: historySearch.start,
    setMode,
    slash,
  });

  const isDraftEmpty = draft.trim() === "" && skillIds.length === 0;

  const status = sendStatus({
    empty: isDraftEmpty,
    loading: props.disabled,
    running: props.running,
    uploading,
    waitReason: props.waitReason,
  });

  const isReady = sendReady({
    blocked: props.disabled || Boolean(props.waitReason),
    busy: uploading,
    empty: isDraftEmpty,
    running: props.running,
  });

  const sendRequest = (request: PromptRequest): Promise<void> =>
    props.onSend(
      request.prompt,
      request.mode,
      request.attachmentIds,
      request.level,
      request.effort,
      request.mentions,
      request.commentIds
    );

  const { canSend, isSending, send } = usePromptSend({
    cleanup: {
      clearMentions: mentions.clear,
      clearPrefill: prefill.clear,
      resetHistory: keys.resetHistory,
    },
    draft,
    draftStore: props.draft,
    effort,
    files,
    isReady,
    level: runLevel.level,
    linkedCommentIds: prefill.linked,
    mentions: mentions.mentions,
    mode,
    onSend: sendRequest,
    selection: props.selection,
    setError,
    setFiles,
    setSkillIds,
    skillIds,
    variations: props.variations,
  });

  usePromptDesktopCommand({
    canSend,
    isRunning: props.running,
    onCancel: props.onCancel,
    send,
  });

  const insertMention = (): void => {
    slash.close();
    setDraft(draft === "" || /\s$/u.test(draft) ? `${draft}@` : `${draft} @`);
    focusComposerInput();
  };

  const openSkills = (): void => {
    slash.openMenu();
    focusComposerInput();
  };

  const stop = (): void => {
    props.onCancel();
    focusComposerInput();
  };

  const onPaste = (event: ClipboardEvent): void => {
    const images = [...event.clipboardData.files].filter((file) =>
      file.type.startsWith("image/")
    );

    if (images.length > 0) {
      event.preventDefault();
      addFiles(images);
    }
  };

  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    setIsDragging(false);
    addFiles([...event.dataTransfer.files]);
  };

  const pickHistory = (prompt: string): void => {
    historySearch.close();
    setDraft(prompt);
    focusComposerInput();
  };

  const dragOver = (event: DragEvent): void => {
    event.preventDefault();
    setIsDragging(true);
  };

  const stopDragging = (): void => setIsDragging(false);
  const clearError = (): void => setError(null);

  const sendProps = {
    canQueue: keys.canQueue,
    canSend,
    hasDraft: draft.trim().length > 0,
    onQueue: keys.queueDraft,
    onSend: send,
    onStop: stop,
    running: props.running,
    sending: isSending,
    tip: status.tip,
  };

  return (
    <div
      ref={promptRef}
      className={toDropClass(isDragging, "prompt")}
      data-ai-scope=""
      onDragOver={dragOver}
      onDragLeave={stopDragging}
      onDrop={onDrop}
      onKeyDownCapture={onKeyCapture}
    >
      {files.map((file) => {
        if (!file.error) {
          return null;
        }

        return (
          <ComposerAlert
            key={file.localId}
            onClose={() => removeFile(file.localId)}
          >
            {file.name}
            {copy.text6}
            {file.error}
          </ComposerAlert>
        );
      })}
      {error && <ComposerAlert onClose={clearError}>{error}</ComposerAlert>}
      {runLevel.error && (
        <ComposerAlert onClose={runLevel.clearError}>
          {runLevel.error}
        </ComposerAlert>
      )}
      <QueuedMessages items={keys.queue} onChange={keys.setQueue} />
      <HistorySearch search={historySearch} onPick={pickHistory} />
      {mentions.picker.open && (
        <MentionList
          shown={mentions.picker.shown}
          current={mentions.picker.current}
          loading={mentions.loading}
          onPick={mentions.pick}
          onHover={mentions.picker.setActive}
        />
      )}
      {slash.open && (
        <SlashMenu
          view={slash.view}
          anchor={() =>
            promptRef.current?.querySelector<HTMLElement>(".composer") ?? null
          }
          input={() =>
            promptRef.current?.querySelector<HTMLElement>(
              '[data-slot="composer-input"]'
            ) ?? null
          }
          onClose={slash.close}
        />
      )}
      <Composer
        className={toDropClass(isDragging, "composer ui-composer cursor-text")}
        onClick={(event) =>
          event.target === event.currentTarget &&
          event.currentTarget.querySelector("textarea")?.focus()
        }
      >
        <RunContextChip chip={props.canvasChip} />
        <Suspense fallback={null}>
          <RepoContextChip
            projectId={props.projectId}
            directionId={props.directionId}
          />
        </Suspense>
        <SelectionChips
          selection={props.selection}
          onRemove={props.onRemoveSelection}
        />
        <ComposerComments
          count={prefill.linked.length}
          onClear={prefill.clear}
        />
        <AttachmentThumbs files={files} onRemove={removeFile} />
        <MentionChips mentions={mentions.mentions} onRemove={mentions.remove} />
        <SkillChips
          ids={skillIds}
          onRemove={(id) =>
            setSkillIds((previous) => previous.filter((entry) => entry !== id))
          }
        />
        <ComposerInput
          className="composer-input min-h-16"
          value={draft}
          aria-label={INPUT_COPY[mode].label}
          placeholder={inputPlaceholder(
            props.running,
            props.waitReason,
            INPUT_COPY[mode].placeholder
          )}
          maxRows={9}
          submitOnEnter={false}
          aria-describedby={status.spoken ? reasonId : undefined}
          {...slash.inputProps}
          onValueChange={(value) => {
            keys.resetHistory();
            setDraft(value);
          }}
          onSubmit={send}
          onPaste={onPaste}
        />
        <PromptToolbar
          designs={designs}
          effort={effort}
          level={runLevel.level}
          mode={mode}
          model={props.model}
          onChooseLevel={runLevel.choose}
          onChooseModel={chooseModel}
          onCloseSlash={slash.close}
          onEffort={setEffort}
          onFiles={addFiles}
          onMention={insertMention}
          onMode={setMode}
          onOpenSkills={openSkills}
          reasonId={reasonId}
          send={sendProps}
          spoken={status.spoken}
        />
      </Composer>
      <Disclosure
        className="prompt-foot"
        lead={
          <SkillsIndicator
            projectId={props.projectId}
            settings={props.settings}
            onSaved={props.onSettingsSaved}
          />
        }
        trail={
          <PromptFootTrail
            contextTokens={props.contextTokens ?? null}
            model={props.model}
            onSettingsSaved={props.onSettingsSaved}
            projectId={props.projectId}
            settings={props.settings}
          />
        }
      />
    </div>
  );
};

export { PromptBox };
