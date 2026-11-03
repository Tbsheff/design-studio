import { lazy, Suspense, useId, useRef, useState } from "react";
import type {
  ClipboardEvent,
  DragEvent,
  KeyboardEvent,
  ReactNode,
} from "react";

import type {
  RunEffort,
  RunLevel,
  CompiledTokenEntry,
  ComponentInfo,
  Project,
  ProjectSettings,
  QueuedMessage,
  RunMention,
  SelectionContext,
} from "../../../shared/contracts.js";
import { elementVariantsIntent } from "../../../shared/element-variants.js";
import { shortcutLabel } from "../../../shared/keymap.js";
import {
  Composer,
  ComposerInput,
  ComposerToolbar,
  ComposerToolbarSpacer,
} from "../../ai/components/ai/composer.js";
import { api, errorText } from "../../api.js";
import {
  composerCommands,
  slashCommands,
  IS_MAC,
  useCommands,
  isModeCycleKey,
  nextMode,
} from "../../chat-slots.js";
import type { Command } from "../../chat-slots.js";
import type { PendingAttachment } from "../../domain/pending-attachment.js";
import { Disclosure } from "../../kit/Disclosure.js";
import { Icon } from "../../kit/Icon.js";
import type { IconName } from "../../kit/Icon.js";
import { useDesktopCommand } from "../../platform/desktop.js";
import { useDraft } from "../../platform/storage.js";
import type { DraftStore } from "../../platform/storage.js";
import { MOD_LABEL } from "../comments/comment-popover.js";
import { ComposerComments } from "../comments/composer-comments.js";
import { useCommentPrefill } from "../comments/use-comment-prefill.js";
import type { PrefillRequest } from "../comments/use-comment-prefill.js";
import {
  MAX_IMAGES,
  imageProblem,
  ComposerAlert,
} from "../home/home-composer-parts.js";
import { BudgetIndicator } from "./budget-indicator.js";
import { useComposerFocus } from "./composer-focus.js";
import {
  PlusMenu,
  MODE_SHORT_HINT,
  LevelPill,
  ModelPill,
} from "./composer-menu.js";
import { AttachmentThumbs, SelectionChips } from "./composer-parts.js";
import { ContextMeter } from "./context-meter.js";
import { HistorySearch, useHistorySearch } from "./history-search.js";
import { MentionChips, MentionList } from "./mention-picker.js";
import { QueuedMessages } from "./queued-messages.js";
import { RunContextChip } from "./run-context-chip.js";
import { MODE_LABEL } from "./run-settings.js";
import type { ComposerMode } from "./run-settings.js";
import {
  useSlashSections,
  SkillChips,
  SkillsIndicator,
} from "./skill-picker.js";
import { skillInstruction } from "./skills-model.js";
import { effortGroup, levelGroup, modelGroup } from "./slash-groups.js";
import type { SlashGroup } from "./slash-menu.js";
import { useSlashMenu, SlashMenu } from "./slash-menu.js";
import { useComposerKeys } from "./use-composer-keys.js";
import { useMentions } from "./use-mentions.js";
import type { MentionRequest } from "./use-mentions.js";
import type { RunCanvasChip } from "./use-run-canvas.js";
import { useRunLevel } from "./use-run-level.js";

const RepoContextChip = lazy(() => import("./repo-context-chip.js"));

const SLASH_HIDDEN = /^composer\.(mode|level)-/u;

type SendState = "send" | "queue" | "stop";

const SEND_LABEL: Record<SendState, string> = {
  queue: "Queue",
  send: "Send",
  stop: "Stop",
};

const useMorph = (key: string): boolean => {
  const last = useRef<string | null>(null);
  const morphed = useRef(false);

  if (last.current !== key) {
    morphed.current = last.current !== null;
    last.current = key;
  }

  return morphed.current;
};

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

const SEND_CLASS: Record<SendState, string> = {
  queue: "icon-btn send send-btn",
  send: "icon-btn send send-btn",
  stop: "icon-btn send-btn stop-btn",
};

const SEND_ICON: Record<SendState, IconName> = {
  queue: "history",
  send: "arrowUp",
  stop: "stop",
};

interface SendView {
  state: SendState;
  busy: boolean;
  disabled: boolean;
  tip: string;
  keys?: string;
  onClick: () => void;
}

const QUEUE_TIP = `Queue (↵) · Send now (${MOD_LABEL}↵) · Stop (${MOD_LABEL}.)`;

const STOP_KEYS = IS_MAC ? "Meta+." : "Control+.";

const sendView = (props: SendProps): SendView => {
  if (props.running && !props.hasDraft) {
    return {
      busy: false,
      disabled: false,
      keys: STOP_KEYS,
      onClick: props.onStop,
      state: "stop",
      tip: `Stop (${MOD_LABEL}.)`,
    };
  }

  if (props.running) {
    return {
      busy: false,
      disabled: !props.canQueue,
      onClick: props.onQueue,
      state: "queue",
      tip: QUEUE_TIP,
    };
  }

  return {
    busy: props.sending,
    disabled: !props.canSend,
    onClick: props.onSend,
    state: "send",
    tip: props.tip,
  };
};

const SendButton = (props: SendProps) => {
  const view = sendView(props);
  const key = view.busy ? "busy" : view.state;
  const morph = useMorph(key);

  return (
    <button
      type="button"
      className={SEND_CLASS[view.state]}
      data-state={key}
      disabled={view.disabled}
      onClick={view.onClick}
      aria-label={view.busy ? "Sending…" : SEND_LABEL[view.state]}
      aria-busy={view.busy || undefined}
      aria-keyshortcuts={view.keys}
      data-tip={view.tip}
      data-tip-align="end"
      data-tip-side="top"
    >
      <span key={key} className={morph ? "send-label morph" : "send-label"}>
        {view.busy ? (
          <span className="spinner" />
        ) : (
          <Icon
            name={SEND_ICON[view.state]}
            size={view.state === "stop" ? 14 : 16}
          />
        )}
      </span>
    </button>
  );
};

const ReasonText = ({ id, text }: { id: string; text: string | null }) => {
  if (!text) {
    return null;
  }

  return (
    <span id={id} className="sr-only">
      {text}
    </span>
  );
};

const StateChip = ({
  label,
  short,
  tip,
  onClear,
}: {
  label: string;
  short: ReactNode;
  tip: string;
  onClear: () => void;
}) => (
  <span
    className="ui-chip composer-state"
    data-tip={tip}
    data-tip-side="top"
    data-tip-align="start"
  >
    <span className="composer-state-short" aria-hidden="true">
      {short}
    </span>
    <span className="composer-state-label">{label}</span>
    <button
      type="button"
      className="icon-btn chip-x"
      aria-label={`Clear ${label}`}
      onClick={onClear}
    >
      <Icon name="close" size={12} />
    </button>
  </span>
);

const MODE_ICON: Record<ComposerMode, IconName> = {
  critique: "eye",
  edit: "pencil",
  plan: "doc",
};

const MODES: readonly ComposerMode[] = ["edit", "plan", "critique"];

const modeGroup = (
  mode: ComposerMode,
  onMode: (mode: ComposerMode) => void
): SlashGroup => ({
  choices: MODES.map((item) => ({
    checked: item === mode,
    hint: MODE_SHORT_HINT[item],
    icon: MODE_ICON[item],
    id: item,
    label: MODE_LABEL[item],
    pick: () => onMode(item),
  })),
  icon: "chat",
  id: "mode",
  label: "Mode",
  value: MODE_LABEL[mode],
});

const INPUT_COPY: Record<ComposerMode, { label: string; placeholder: string }> =
  {
    critique: {
      label: "Ask for a critique",
      placeholder: "Ask for a critique…",
    },
    edit: {
      label: "Describe what you want to create",
      placeholder: "Describe what you want to create…",
    },
    plan: {
      label: "Describe what to plan",
      placeholder: "Describe what to plan…",
    },
  };

const sendReady = (state: {
  running: boolean;
  blocked: boolean;
  busy: boolean;
  empty: boolean;
}): boolean => !state.running && !state.blocked && !state.busy && !state.empty;

const RUNNING_PLACEHOLDER = `Queue a note (↵) or send it now (${MOD_LABEL}↵)`;

const inputPlaceholder = (
  mode: ComposerMode,
  running: boolean,
  waitReason: string | null | undefined
): string => {
  if (waitReason) {
    return waitReason;
  }

  return running
    ? RUNNING_PLACEHOLDER
    : `${INPUT_COPY[mode].placeholder} (${MOD_LABEL}↵ to send)`;
};

const EMPTY_REASON = "Type a message to send";

interface SendStatus {
  tip: string;
  spoken: string | null;
}

const sendBlocker = (state: {
  waitReason: string | null | undefined;
  loading: boolean;
  uploading: boolean;
  empty: boolean;
}): string | null => {
  if (state.waitReason) {
    return state.waitReason;
  }

  if (state.loading) {
    return "Wait for the design to load";
  }

  if (state.uploading) {
    return "Wait for the images to upload";
  }

  if (state.empty) {
    return EMPTY_REASON;
  }

  return null;
};

const sendStatus = (state: {
  running: boolean;
  waitReason: string | null | undefined;
  loading: boolean;
  uploading: boolean;
  empty: boolean;
}): SendStatus => {
  const blocker = state.running ? null : sendBlocker(state);

  return {
    spoken: blocker === EMPTY_REASON ? null : blocker,
    tip: blocker ?? `Send (${MOD_LABEL}↵)`,
  };
};

const designsBlocker = (
  mode: ComposerMode,
  selectionCount: number
): string | null => {
  if (mode === "critique") {
    return "Critique makes one review.";
  }

  if (mode === "plan") {
    return "Plan makes one plan.";
  }

  if (selectionCount > 0) {
    return "Variations need an empty selection.";
  }

  return null;
};

const isPlainEscape = (event: KeyboardEvent<HTMLDivElement>): boolean =>
  event.key === "Escape" &&
  !event.nativeEvent.isComposing &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.shiftKey;

const leaveComposer = (input: HTMLElement): void => {
  const stage = document.querySelector<HTMLElement>(".stage");

  if (stage) {
    stage.focus({ preventScroll: true });
  } else {
    input.blur();
  }
};

interface PromptKeyInput {
  historySearch: ReturnType<typeof useHistorySearch>;
  keys: ReturnType<typeof useComposerKeys>;
  mentions: ReturnType<typeof useMentions>;
  mode: ComposerMode;
  setMode: (mode: ComposerMode) => void;
  slash: ReturnType<typeof useSlashMenu>;
}

const usePromptKeyCapture = (input: PromptKeyInput) => {
  const { historySearch, keys, mentions, mode, setMode, slash } = input;

  const onKeyCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    const inInput = (event.target as HTMLElement).matches(
      '[data-slot="composer-input"]'
    );

    if (inInput && event.ctrlKey && !event.metaKey && event.key === "r") {
      event.preventDefault();
      historySearch.start();

      return;
    }

    if (inInput && (slash.onKeyDown(event) || mentions.onKeyDown(event))) {
      return;
    }

    if (inInput && isPlainEscape(event)) {
      event.preventDefault();
      leaveComposer(event.target as HTMLElement);

      return;
    }

    if (inInput && isModeCycleKey(event)) {
      event.preventDefault();
      setMode(nextMode(mode));

      return;
    }

    keys.onKeyDown(event);
  };

  return onKeyCapture;
};

const usePromptFiles = (
  projectId: string,
  setError: (message: string | null) => void
) => {
  const [files, setFiles] = useState<PendingAttachment[]>([]);

  const addFiles = (list: Iterable<File>) => {
    let room = MAX_IMAGES - files.length;
    const problems = new Set<string>();

    for (const file of list) {
      const problem =
        imageProblem(file) ??
        (room <= 0 ? `You can attach up to ${MAX_IMAGES} images.` : null);

      if (problem) {
        problems.add(problem);
        continue;
      }

      room -= 1;
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      setFiles((prev) => [
        ...prev,
        { attachment: null, error: null, localId, name: file.name, previewUrl },
      ]);
      api
        .uploadAttachment(projectId, file)
        .then((attachment) =>
          setFiles((prev) =>
            prev.map((f) => (f.localId === localId ? { ...f, attachment } : f))
          )
        )
        .catch((caught) =>
          setFiles((prev) =>
            prev.map((f) =>
              f.localId === localId ? { ...f, error: errorText(caught) } : f
            )
          )
        );
    }

    if (problems.size > 0) {
      setError([...problems].join(" "));
    }
  };

  const removeFile = (localId: string) =>
    setFiles((prev) => {
      const f = prev.find((x) => x.localId === localId);

      if (f) {
        URL.revokeObjectURL(f.previewUrl);
      }

      return prev.filter((x) => x.localId !== localId);
    });

  const uploading = files.some((f) => !f.attachment && !f.error);

  return { addFiles, files, removeFile, setFiles, uploading };
};

const sendErrorText = (err: unknown): string => {
  if (err instanceof TypeError) {
    return "Could not reach the studio. Your message is still here. Check that the studio runs, then send again.";
  }

  return errorText(err);
};

interface VariationsPromptProps {
  count: number;
  max: number;
  onCount: (count: number) => void;
  onSend: (
    prompt: string,
    level: RunLevel,
    attachmentIds: string[]
  ) => Promise<void>;
  onElement?: (prompt: string, count: number, level: RunLevel) => Promise<void>;
}

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

interface PromptSendInput {
  canSend: boolean;
  draft: string;
  effort: RunEffort | null;
  files: PendingAttachment[];
  keys: ReturnType<typeof useComposerKeys>;
  level: RunLevel;
  mentions: ReturnType<typeof useMentions>;
  mode: ComposerMode;
  prefill: ReturnType<typeof useCommentPrefill>;
  props: Props;
  setDraft: (value: string) => void;
  setError: (message: string | null) => void;
  setFiles: (files: PendingAttachment[]) => void;
  setSending: (value: boolean) => void;
  setSkillIds: (ids: string[]) => void;
  skillIds: string[];
}

const usePromptSend = (input: PromptSendInput) => {
  const {
    canSend,
    draft,
    effort,
    files,
    keys,
    level,
    mentions,
    mode,
    prefill,
    props,
    setDraft,
    setError,
    setFiles,
    setSending,
    setSkillIds,
    skillIds,
  } = input;

  const send = async () => {
    if (!canSend) {
      return;
    }

    setSending(true);
    setError(null);
    const sentDraft = draft;

    try {
      const ids = files.flatMap((f) => (f.attachment ? [f.attachment.id] : []));

      const prompt = [draft.trim(), skillInstruction(skillIds)]
        .filter(Boolean)
        .join("\n\n");

      const fanOut =
        mode === "edit" &&
        props.variations &&
        props.variations.count > 1 &&
        props.selection.length === 0;

      const elementCount =
        mode === "edit" && props.selection.length === 1
          ? elementVariantsIntent(prompt)
          : null;

      const onElement = props.variations?.onElement;

      const sent =
        elementCount && onElement
          ? onElement(prompt, elementCount, level)
          : fanOut && props.variations
            ? props.variations.onSend(prompt, level, ids)
            : props.onSend(
                prompt,
                mode,
                ids,
                level,
                effort,
                mentions.mentions,
                prefill.linked
              );

      setDraft("");
      await sent;
      mentions.clear();
      prefill.clear();
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setFiles([]);
      setSkillIds([]);
      keys.resetHistory();
    } catch (caught) {
      if (!props.draft.get().trim()) {
        setDraft(sentDraft);
      }

      setError(sendErrorText(caught));
    } finally {
      setSending(false);
    }
  };

  return send;
};

interface PromptAlertsProps {
  error: string | null;
  files: PendingAttachment[];
  levelError: string | null;
  onClearError: () => void;
  onClearLevelError: () => void;
  onRemoveFile: (localId: string) => void;
}

const PromptAlerts = (props: PromptAlertsProps) => (
  <>
    {props.files
      .filter((f) => f.error)
      .map((f) => (
        <ComposerAlert
          key={f.localId}
          onClose={() => props.onRemoveFile(f.localId)}
        >
          {f.name}: {f.error}
        </ComposerAlert>
      ))}
    {props.error && (
      <ComposerAlert onClose={() => props.onClearError()}>
        {props.error}
      </ComposerAlert>
    )}
    {props.levelError && (
      <ComposerAlert onClose={props.onClearLevelError}>
        {props.levelError}
      </ComposerAlert>
    )}
  </>
);

interface PromptFootProps {
  contextTokens: number | null;
  model: string;
  onSaved: (project: Project) => void;
  projectId: string;
  settings: ProjectSettings;
}

const PromptFoot = (props: PromptFootProps) => (
  <Disclosure
    className="prompt-foot"
    lead={
      <SkillsIndicator
        projectId={props.projectId}
        settings={props.settings}
        onSaved={props.onSaved}
      />
    }
    trail={
      <span className="prompt-foot-trail">
        <BudgetIndicator
          projectId={props.projectId}
          settings={props.settings}
          onSaved={props.onSaved}
        />
        <ContextMeter tokens={props.contextTokens} model={props.model} />
      </span>
    }
  />
);

export const PromptBox = (props: Props) => {
  const [mode, setMode] = useState<ComposerMode>("edit");
  const [effort, setEffort] = useState<RunEffort | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addFiles, files, removeFile, setFiles, uploading } = usePromptFiles(
    props.projectId,
    setError
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const reasonId = useId();
  const [skillIds, setSkillIds] = useState<string[]>([]);

  const runLevel = useRunLevel(
    props.projectId,
    props.settings.defaultLevel,
    props.onSettingsSaved
  );

  const draft = useDraft(props.draft);
  const setDraft = props.draft.set;

  useComposerFocus(props.running, !props.disabled);

  const focusInput = () =>
    globalThis.requestAnimationFrame(() =>
      document
        .querySelector<HTMLTextAreaElement>(
          '.prompt [data-slot="composer-input"]'
        )
        ?.focus()
    );

  useCommands(() =>
    composerCommands({
      focus: focusInput,
      level: runLevel.level,
      mode,
      setLevel: runLevel.choose,
      setMode,
      variations: props.variations,
    })
  );

  const slashSource = useSlashSections({
    commands: slashCommands().filter(
      (command) => !SLASH_HIDDEN.test(command.id)
    ),
    disabled: props.settings.disabledSkills ?? [],
    exclude: skillIds,
    onCommand: (command: Command) => command.run(),
    onSkill: (id) =>
      setSkillIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
  });

  const chooseModel = (model: string) => {
    if (model === props.model) {
      return;
    }

    setError(null);
    api
      .updateSettings(props.projectId, { model })
      .then(props.onSettingsSaved)
      .catch((caught: unknown) =>
        setError(`Could not save the model: ${errorText(caught)}`)
      );
  };

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

  const promptRef = useRef<HTMLDivElement>(null);

  const insertMention = () => {
    slash.close();
    setDraft(draft === "" || /\s$/u.test(draft) ? `${draft}@` : `${draft} @`);
    focusInput();
  };

  const designs = props.variations && {
    disabledReason: designsBlocker(mode, props.selection.length),
    max: props.variations.max,
    onChange: props.variations.onCount,
    value: props.variations.count,
  };

  const prefill = useCommentPrefill({
    draft: props.draft,
    focus: focusInput,
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
    historySearch,
    keys,
    mentions,
    mode,
    setMode,
    slash,
  });

  const emptyDraft = draft.trim() === "" && skillIds.length === 0;

  const status = sendStatus({
    empty: emptyDraft,
    loading: props.disabled,
    running: props.running,
    uploading,
    waitReason: props.waitReason,
  });

  const canSend = sendReady({
    blocked: props.disabled || Boolean(props.waitReason),
    busy: sending || uploading,
    empty: emptyDraft,
    running: props.running,
  });

  const send = usePromptSend({
    canSend,
    draft,
    effort,
    files,
    keys,
    level: runLevel.level,
    mentions,
    mode,
    prefill,
    props,
    setDraft,
    setError,
    setFiles,
    setSending,
    setSkillIds,
    skillIds,
  });

  useDesktopCommand((command) => {
    if (command.type === "run") {
      if (canSend) {
        void send();
      } else {
        document
          .querySelector<HTMLTextAreaElement>(".prompt textarea")
          ?.focus();
      }

      return true;
    }

    if (command.type === "stop") {
      if (props.running) {
        props.onCancel();
      }

      return true;
    }

    return false;
  });

  const onPaste = (e: ClipboardEvent) => {
    const images = [...e.clipboardData.files].filter((f) =>
      f.type.startsWith("image/")
    );

    if (images.length > 0) {
      e.preventDefault();
      addFiles(images);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles([...e.dataTransfer.files]);
  };

  return (
    <div
      ref={promptRef}
      className={`prompt ${dragging ? "dragging" : ""}`}
      data-ai-scope=""
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onKeyDownCapture={onKeyCapture}
    >
      <PromptAlerts
        error={error}
        files={files}
        levelError={runLevel.error}
        onClearError={() => setError(null)}
        onClearLevelError={runLevel.clearError}
        onRemoveFile={removeFile}
      />
      <QueuedMessages items={keys.queue} onChange={keys.setQueue} />
      <HistorySearch
        search={historySearch}
        onPick={(prompt) => {
          historySearch.close();
          setDraft(prompt);
          globalThis.requestAnimationFrame(() =>
            document
              .querySelector<HTMLTextAreaElement>(
                '.prompt [data-slot="composer-input"]'
              )
              ?.focus()
          );
        }}
      />
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
        className={`composer ui-composer cursor-text ${dragging ? "dragging" : ""}`}
        onClick={(e) =>
          e.target === e.currentTarget &&
          e.currentTarget.querySelector("textarea")?.focus()
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
          onRemove={(id) => setSkillIds((prev) => prev.filter((x) => x !== id))}
        />
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
          {mode !== "edit" && (
            <StateChip
              label={MODE_LABEL[mode]}
              short={<Icon name={MODE_ICON[mode]} size={14} />}
              tip={`${MODE_LABEL[mode]} mode. ${shortcutLabel("composer-mode", IS_MAC)} cycles modes.`}
              onClear={() => setMode("edit")}
            />
          )}
          {designs && designs.value > 1 && designs.disabledReason === null && (
            <StateChip
              label={`${designs.value} designs`}
              short={`${designs.value}×`}
              tip={`Send makes ${designs.value} designs side by side.`}
              onClear={() => designs.onChange(1)}
            />
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) {
                addFiles([...e.target.files]);
              }

              e.target.value = "";
            }}
          />
          <ComposerToolbarSpacer className="prompt-send gap-1">
            <LevelPill
              level={runLevel.level}
              onLevel={runLevel.choose}
              onOpen={slash.close}
            />
            <ModelPill
              model={props.model}
              level={runLevel.level}
              effort={{ onChange: setEffort, value: effort }}
              onModel={chooseModel}
              onOpen={slash.close}
            />
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
      <PromptFoot
        contextTokens={props.contextTokens ?? null}
        model={props.model}
        projectId={props.projectId}
        settings={props.settings}
        onSaved={props.onSettingsSaved}
      />
    </div>
  );
};
