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
import { elementVariantsIntent } from "@design-studio/contracts/element-variants";
import { Disclosure, Icon } from "@design-studio/ui";
import {
  Suspense,
  useId,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

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
  isModeCycleKey,
  nextMode,
  slashCommands,
  IS_MAC,
  useCommands,
  type Command,
} from "../../chat-slots.js";
import { useDesktopCommand } from "../../platform/desktop.js";
import { useDraft, type DraftStore } from "../../platform/storage.js";
import { MOD_LABEL } from "../comments/comment-popover.js";
import { ComposerComments } from "../comments/composer-comments.js";
import {
  useCommentPrefill,
  type PrefillRequest,
} from "../comments/use-comment-prefill.js";
import {
  ComposerAlert,
  MAX_IMAGES,
  imageProblem,
} from "../home/home-composer-parts.js";
import { BudgetIndicator } from "./budget-indicator.js";
import { useComposerFocus } from "./composer-focus.js";
import {
  LevelPill,
  MODE_SHORT_HINT,
  ModelPill,
  PlusMenu,
} from "./composer-menu.js";
import {
  AttachmentThumbs,
  SelectionChips,
  type PendingAttachment,
} from "./composer-parts.js";
import { ContextMeter } from "./context-meter.js";
import { copy } from "./copy.js";
import { HistorySearch, useHistorySearch } from "./history-search.js";
import { MentionChips, MentionList } from "./mention-picker.js";
import {
  EMPTY_REASON,
  INPUT_COPY,
  MODES,
  MODE_ICON,
  RepoContextChip,
  SEND_CLASS,
  SEND_ICON,
  SEND_LABEL,
} from "./prompt-box-model.js";
import type {
  SendProps,
  SendState,
  SendStatus,
  SendView,
  VariationsPromptProps,
} from "./prompt-box-model.js";
import { QueuedMessages } from "./queued-messages.js";
import { RunContextChip } from "./run-context-chip.js";
import { MODE_LABEL, type ComposerMode } from "./run-settings.js";
import {
  SkillChips,
  SkillsIndicator,
  useSlashSections,
} from "./skill-picker.js";
import { skillInstruction } from "./skills-model.js";
import { effortGroup, levelGroup, modelGroup } from "./slash-groups.js";
import { SlashMenu, useSlashMenu, type SlashGroup } from "./slash-menu.js";
import { useComposerKeys } from "./use-composer-keys.js";
import { useMentions, type MentionRequest } from "./use-mentions.js";
import type { RunCanvasChip } from "./use-run-canvas.js";
import { useRunLevel } from "./use-run-level.js";

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

const useMorph = (key: string): boolean => {
  const last = useRef<string | null>(null);
  const morphed = useRef(false);

  if (last.current !== key) {
    morphed.current = last.current !== null;
    last.current = key;
  }

  return morphed.current;
};

const QUEUE_TIP = `Queue (↵) · Send now (${MOD_LABEL}↵) · Stop (${MOD_LABEL}.)`;
const STOP_KEYS = IS_MAC ? "Meta+." : "Control+.";

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

const SendButton = (props: SendProps): ReactElement => {
  const view = sendView(props);
  let key: "busy" | SendState = "busy";

  if (!view.busy) {
    key = view.state;
  }

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
        {view.busy && <span className="spinner" />}
        {!view.busy && (
          <Icon
            name={SEND_ICON[view.state]}
            size={view.state === "stop" ? 14 : 16}
          />
        )}
      </span>
    </button>
  );
};

const ReasonText = ({
  id,
  text,
}: {
  id: string;
  text: string | null;
}): ReactElement | null => {
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
}): ReactElement => (
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

const SLASH_HIDDEN = /^composer\.(?:mode|level)-/;

const RUNNING_PLACEHOLDER = `Queue a note (↵) or send it now (${MOD_LABEL}↵)`;

const sendReady = (state: {
  running: boolean;
  blocked: boolean;
  busy: boolean;
  empty: boolean;
}): boolean => !state.running && !state.blocked && !state.busy && !state.empty;

const inputPlaceholder = (
  mode: ComposerMode,
  running: boolean,
  waitReason: string | null | undefined
): string => {
  if (waitReason) {
    return waitReason;
  }

  if (running) {
    return RUNNING_PLACEHOLDER;
  }

  return `${INPUT_COPY[mode].placeholder} (${MOD_LABEL}↵ to send)`;
};

const sendStatus = (state: {
  running: boolean;
  waitReason: string | null | undefined;
  loading: boolean;
  uploading: boolean;
  empty: boolean;
}): SendStatus => {
  let blocker: string | null = null;

  if (!state.running) {
    blocker = sendBlocker(state);
  }

  return {
    spoken: blocker === EMPTY_REASON ? null : blocker,
    tip: blocker ?? `Send (${MOD_LABEL}↵)`,
  };
};

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

const sendErrorText = (err: unknown): string => {
  if (err instanceof TypeError) {
    return "Could not reach the studio. Your message is still here. Check that the studio runs, then send again.";
  }

  return errorText(err);
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

const PromptBox = (props: Props): ReactElement => {
  const [mode, setMode] = useState<ComposerMode>("edit");
  const [effort, setEffort] = useState<RunEffort | null>(null);
  const [files, setFiles] = useState<PendingAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sending, startSending] = useTransition();
  const [error, setError] = useState<string | null>(null);
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

  const focusInput = (): number =>
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
      setSkillIds((prev) => {
        if (prev.includes(id)) {
          return prev;
        }

        return [...prev, id];
      }),
  });

  const addFiles = (list: Iterable<File>): void => {
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
        .uploadAttachment(props.projectId, file)
        .then((attachment) =>
          setFiles((prev) =>
            prev.map((entry) => {
              if (entry.localId === localId) {
                return { ...entry, attachment };
              }

              return entry;
            })
          )
        )
        .catch((err) =>
          setFiles((prev) =>
            prev.map((entry) => {
              if (entry.localId === localId) {
                return { ...entry, error: errorText(err) };
              }

              return entry;
            })
          )
        );
    }

    if (problems.size > 0) {
      setError([...problems].join(" "));
    }
  };

  const removeFile = (localId: string): void =>
    setFiles((prev) => {
      const file = prev.find((wasOpen) => wasOpen.localId === localId);

      if (file) {
        URL.revokeObjectURL(file.previewUrl);
      }

      return prev.filter((wasOpen) => wasOpen.localId !== localId);
    });

  const chooseModel = (model: string): void => {
    if (model === props.model) {
      return;
    }

    setError(null);
    api
      .updateSettings(props.projectId, { model })
      .then(props.onSettingsSaved)
      .catch((err: unknown) =>
        setError(`Could not save the model: ${errorText(err)}`)
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

  const insertMention = (): void => {
    slash.close();
    setDraft(draft === "" || /\s$/.test(draft) ? `${draft}@` : `${draft} @`);
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

  const uploading = files.some((file) => !file.attachment && !file.error);

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

  const onKeyCapture = (event: KeyboardEvent<HTMLDivElement>): void => {
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

  const send = (): void => {
    if (!canSend) {
      return;
    }

    setError(null);
    const sentDraft = draft;

    startSending(async () => {
      try {
        const ids = files.flatMap((file) => {
          if (file.attachment) {
            return [file.attachment.id];
          }

          return [];
        });

        const prompt = [draft.trim(), skillInstruction(skillIds)]
          .filter(Boolean)
          .join("\n\n");

        const fanOut =
          mode === "edit" &&
          props.variations &&
          props.variations.count > 1 &&
          props.selection.length === 0;

        let elementCount: number | null = null;

        if (mode === "edit" && props.selection.length === 1) {
          elementCount = elementVariantsIntent(prompt);
        }

        const onElement = props.variations?.onElement;

        const sent =
          elementCount && onElement
            ? onElement(prompt, elementCount, runLevel.level)
            : fanOut && props.variations
              ? props.variations.onSend(prompt, runLevel.level, ids)
              : props.onSend(
                  prompt,
                  mode,
                  ids,
                  runLevel.level,
                  effort,
                  mentions.mentions,
                  prefill.linked
                );

        setDraft("");
        await sent;
        mentions.clear();
        prefill.clear();
        files.forEach((file) => URL.revokeObjectURL(file.previewUrl));
        setFiles([]);
        setSkillIds([]);
        keys.resetHistory();
      } catch (err) {
        if (!props.draft.get().trim()) {
          setDraft(sentDraft);
        }

        setError(sendErrorText(err));
      }
    });
  };

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

  const onPaste = (event: ClipboardEvent): void => {
    const images = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (images.length > 0) {
      event.preventDefault();
      addFiles(images);
    }
  };

  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      ref={promptRef}
      className={`prompt ${dragging ? "dragging" : ""}`}
      data-ai-scope=""
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onKeyDownCapture={onKeyCapture}
    >
      {files
        .filter((file) => file.error)
        .map((file) => (
          <ComposerAlert
            key={file.localId}
            onClose={() => removeFile(file.localId)}
          >
            {file.name}
            {copy.text6}
            {file.error}
          </ComposerAlert>
        ))}
      {error && (
        <ComposerAlert onClose={() => setError(null)}>{error}</ComposerAlert>
      )}
      {runLevel.error && (
        <ComposerAlert onClose={runLevel.clearError}>
          {runLevel.error}
        </ComposerAlert>
      )}
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
            setSkillIds((prev) => prev.filter((wasOpen) => wasOpen !== id))
          }
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
            onChange={(event) => {
              if (event.target.files) {
                addFiles(Array.from(event.target.files));
              }

              event.target.value = "";
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
          <span className="prompt-foot-trail">
            <BudgetIndicator
              projectId={props.projectId}
              settings={props.settings}
              onSaved={props.onSettingsSaved}
            />
            <ContextMeter
              tokens={props.contextTokens ?? null}
              model={props.model}
            />
          </span>
        }
      />
    </div>
  );
};

export { PromptBox };
