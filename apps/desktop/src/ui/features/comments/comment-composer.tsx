import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  useLayoutEffect,
} from "react";
import type {
  ClipboardEvent,
  DragEvent,
  RefObject,
  KeyboardEvent,
  PointerEvent,
} from "react";

import { AvatarFace } from "./comment-avatar.js";
import type { Breadcrumb, CardSide, PinOffset } from "./comment-placement.js";
import { CARD_WIDTH, placeComposer, useCardSize } from "./comment-placement.js";
import { trapTab, MOD_LABEL } from "./comment-popover.js";
import { copy } from "./copy.js";
import {
  Icon,
  MentionList,
  mentionIcon,
  mentionKey,
  mentionLabel,
  mentionTitle,
  readStored,
  useMentions,
  writeStored,
  api,
} from "./deps.js";
import type {
  CompiledTokenEntry,
  ComponentInfo,
  MentionOption,
  RunMention,
  SelectionContext,
} from "./deps.js";

type Rect = SelectionContext["rect"];

export interface ComposerSources {
  projectId: string;
  directionId: string | null;
  tokens?: readonly CompiledTokenEntry[];
  components?: readonly ComponentInfo[] | null;
}

export interface ComposerSubmit {
  text: string;
  toClaude: boolean;
  now: boolean;
  mentions: RunMention[];
  attachmentIds: string[];
}

interface ComposerProps {
  label: string;
  testId: string;
  anchor: Rect;
  offset?: PinOffset;
  zoom: number;
  frame: { width: number; height: number };
  breadcrumb: Breadcrumb;
  initial: string | null;
  autoFocus: boolean;
  trap: boolean;
  focusRef?: RefObject<HTMLTextAreaElement | null>;
  draftKey: string;
  running: boolean;
  busy: boolean;
  sources: ComposerSources;
  images: boolean;
  steer: boolean;
  onSubmit: (input: ComposerSubmit) => Promise<boolean>;
  onCancel: () => void;
}

const SEND_KEY = "studio.comments.sendToClaude";

const CLOSE_MS = 120;

const drafts = new Map<string, string>();

const CLAUDE_OPTION: MentionOption = {
  detail: "Send to Claude",
  icon: "sparkle",
  key: "agent:claude",
  label: "Claude",
  mention: { file: null, kind: "component", name: "Claude", selector: null },
};

const readSend = (): boolean => readStored(SEND_KEY) === "1";

const writeSend = (on: boolean): void => {
  writeStored(SEND_KEY, on ? "1" : "0");
};

const reducedMotion = (): boolean =>
  globalThis.window !== undefined &&
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

interface ImageChip {
  key: string;
  url: string;
  name: string;
  id: string | null;
  failed: boolean;
}

const IMAGE_MAX = 4;

const useImages = (projectId: string) => {
  const [images, setImages] = useState<ImageChip[]>([]);
  const imageCounter = useRef(0);
  const live = useRef(images);
  live.current = images;
  useEffect(
    () => () => live.current.forEach((image) => URL.revokeObjectURL(image.url)),
    []
  );

  const upload = async (key: string, file: File) => {
    try {
      const attachment = await api.uploadAttachment(projectId, file);
      setImages((prev) =>
        prev.map((image) =>
          image.key === key ? { ...image, id: attachment.id } : image
        )
      );
    } catch {
      setImages((prev) =>
        prev.map((image) =>
          image.key === key ? { ...image, failed: true } : image
        )
      );
    }
  };

  const add = (files: File[]) => {
    const room = IMAGE_MAX - live.current.length;

    for (const file of files.slice(0, Math.max(0, room))) {
      imageCounter.current += 1;
      const key = `img${imageCounter.current}`;
      setImages((prev) => [
        ...prev,
        {
          failed: false,
          id: null,
          key,
          name: file.name || "Pasted image",
          url: URL.createObjectURL(file),
        },
      ]);
      void upload(key, file);
    }
  };

  const remove = (key: string) =>
    setImages((prev) => {
      const gone = prev.find((image) => image.key === key);

      if (gone) {
        URL.revokeObjectURL(gone.url);
      }
      return prev.filter((image) => image.key !== key);
    });

  return {
    add,
    images,
    pending: images.some((image) => image.id === null && !image.failed),
    remove,
  };
};

const LEAD_GAP = 6;

const MIN_FIRST_LINE = 140;

const useLeadWidth = (
  leadRef: RefObject<HTMLSpanElement | null>,
  card: RefObject<HTMLDivElement | null>
) => {
  const [state, setState] = useState({ inline: false, width: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const lead = leadRef.current;
      const field = lead?.parentElement;

      if (!lead || !field) {
        setState((prev) =>
          prev.width === 0 && !prev.inline ? prev : { inline: false, width: 0 }
        );

        return;
      }

      const width = lead.offsetWidth;
      const inline = width + LEAD_GAP + MIN_FIRST_LINE <= field.clientWidth;
      setState((prev) =>
        prev.width === width && prev.inline === inline
          ? prev
          : { inline, width }
      );
    };

    measure();
    const observer = new ResizeObserver(measure);

    if (leadRef.current) {
      observer.observe(leadRef.current);
    }
    if (card.current) {
      observer.observe(card.current);
    }
    return () => observer.disconnect();
  });

  return state;
};

const Pill = ({
  icon,
  label,
  full,
  tip,
  tone,
  onRemove,
}: {
  icon?: Parameters<typeof Icon>[0]["name"];
  label: string;
  full?: string;
  tip?: string;
  tone?: string;
  onRemove: () => void;
}) => (
  <span
    className={`comment-pill ${tone ?? ""}`}
    data-tip={tip ?? full}
    data-tip-side="top"
    data-testid="comment-pill"
  >
    {icon && <Icon name={icon} size={12} />}
    <span className="comment-pill-label">{label}</span>
    <button
      type="button"
      tabIndex={-1}
      aria-label={`Remove ${label}`}
      onClick={onRemove}
    >
      <Icon name="close" size={10} />
    </button>
  </span>
);

const RunHint = ({ queueOnly }: { queueOnly: boolean }) => (
  <p className="comment-card-hint" role="note" data-testid="comment-run-hint">
    <span className="comment-card-live" aria-hidden="true" />
    {queueOnly ? (
      <>
        Claude is working. <kbd>↵</kbd> queues this for after the run.
      </>
    ) : (
      <>
        Claude is working. <kbd>↵</kbd> queues this · <kbd>{MOD_LABEL}↵</kbd>{" "}
        sends it now
      </>
    )}
  </p>
);

interface FootProps {
  toClaude: boolean;
  onToClaude: (on: boolean) => void;
  blocked: boolean;
  submitting: boolean;
  onSubmit: () => void;
  hint: { queueOnly: boolean } | null;
}

const ComposerFoot = ({
  toClaude,
  onToClaude,
  blocked,
  submitting,
  onSubmit,
  hint,
}: FootProps) => (
  <>
    <div className="comment-card-foot">
      <label className="comment-check">
        <input
          type="checkbox"
          checked={toClaude}
          onChange={(event) => onToClaude(event.target.checked)}
        />
        <span>Send to Claude</span>
      </label>
      <button
        type="button"
        className={`comment-submit${toClaude ? " to-claude" : ""}`}
        aria-label={toClaude ? "Send" : "Save comment"}
        aria-keyshortcuts="Enter"
        data-tip={toClaude ? "Send  ↵" : "Save comment  ↵"}
        data-tip-side="top"
        disabled={blocked}
        onClick={onSubmit}
      >
        {submitting ? (
          <span className="spinner" />
        ) : (
          <Icon name={toClaude ? "arrowUp" : "check"} size={14} />
        )}
      </button>
    </div>
    {hint && <RunHint queueOnly={hint.queueOnly} />}
  </>
);

const imageFiles = (list: FileList | null | undefined): File[] =>
  [...(list ?? [])].filter((file) => file.type.startsWith("image/"));

interface ImageDropTarget {
  add: (files: File[]) => void;
}

const useImageDrop = (
  isEnabled: boolean,
  images: ImageDropTarget,
  area: RefObject<HTMLTextAreaElement | null>
) => {
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!isEnabled) {
      return;
    }
    const files = imageFiles(event.clipboardData.files);
    if (files.length === 0) {
      return;
    }
    event.preventDefault();
    images.add(files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isEnabled && event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isEnabled) {
      return;
    }
    const files = imageFiles(event.dataTransfer.files);
    if (files.length === 0) {
      return;
    }
    event.preventDefault();
    images.add(files);
    area.current?.focus();
  };

  return { onDragOver, onDrop, onPaste };
};

export const CommentComposer = (props: ComposerProps) => {
  const [text, setTextState] = useState(() => drafts.get(props.draftKey) ?? "");
  const [toClaude, setToClaudeState] = useState(readSend);
  const [closing, setClosing] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const own = useRef<HTMLTextAreaElement>(null);
  const area = props.focusRef ?? own;
  const card = useRef<HTMLDivElement>(null);
  const side = useRef<CardSide | undefined>(undefined);
  const size = useCardSize(card);
  const images = useImages(props.sources.projectId);
  const leadRef = useRef<HTMLSpanElement>(null);
  const leadBox = useLeadWidth(leadRef, card);

  const setText = (value: string) => {
    setTextState(value);
    if (value.trim() === "") {
      drafts.delete(props.draftKey);
    } else {
      drafts.set(props.draftKey, value);
    }
  };
  const setToClaude = (on: boolean) => {
    setToClaudeState(on);
    writeSend(on);
  };
  const lead = useMemo(() => (toClaude ? [] : [CLAUDE_OPTION]), [toClaude]);
  const mentions = useMentions({
    components: props.sources.components,
    directionId: props.sources.directionId,
    draft: text,
    lead,
    onLead: () => setToClaude(true),
    projectId: props.sources.projectId,
    setDraft: setText,
    tokens: props.sources.tokens,
  });

  useEffect(() => {
    if (props.autoFocus) {
      area.current?.focus({ preventScroll: true });
    }
  }, [props.autoFocus, area]);

  const placement = placeComposer(
    props.anchor,
    { card: size, frame: props.frame, zoom: props.zoom },
    side.current,
    props.offset
  );
  side.current = placement.side;
  const scale = 1 / props.zoom;
  const empty = text.trim() === "";
  const blocked = empty || props.busy || submitting || images.pending;
  const readyImages = images.images
    .filter((image) => image.id !== null)
    .map((image) => image.id as string);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (closeTimer.current !== null) {
        globalThis.clearTimeout(closeTimer.current);
      }
    },
    []
  );
  const closeWith = (finish: () => void) => {
    if (reducedMotion()) {
      finish();
      return;
    }
    setClosing(true);
    closeTimer.current = globalThis.setTimeout(finish, CLOSE_MS);
  };

  const submit = (now: boolean) => {
    if (blocked) {
      return;
    }
    startSubmit(async () => {
      const ok = await props.onSubmit({
        attachmentIds: readyImages,
        mentions: mentions.mentions,
        now,
        text: text.trim(),
        toClaude,
      });
      if (!ok) {
        return;
      }
      drafts.delete(props.draftKey);
      setTextState("");
      mentions.clear();
    });
  };

  const removeLast = (): boolean => {
    const lastImage = images.images.at(-1);
    if (lastImage) {
      images.remove(lastImage.key);
      return true;
    }
    const lastMention = mentions.mentions.at(-1);
    if (lastMention) {
      mentions.remove(mentionKey(lastMention));
      return true;
    }
    if (toClaude) {
      setToClaude(false);
      return true;
    }
    return false;
  };

  const onCardKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (mentions.onKeyDown(event)) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeWith(props.onCancel);
      return;
    }
    if (props.trap) {
      trapTab(event, card.current);
    }
  };

  const onAreaKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || mentions.onKeyDown(event)) {
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit(event.metaKey || event.ctrlKey);
      return;
    }
    const caretAtStart =
      event.currentTarget.selectionStart === 0 &&
      event.currentTarget.selectionEnd === 0;
    if (event.key === "Backspace" && caretAtStart && removeLast()) {
      event.preventDefault();
    }
  };

  const { onDragOver, onDrop, onPaste } = useImageDrop(
    Boolean(props.images),
    images,
    area
  );

  const focusField = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    event.preventDefault();
    area.current?.focus();
  };

  const state = closing ? " closing" : "";
  const hasLead =
    toClaude || mentions.mentions.length > 0 || images.images.length > 0;
  return (
    <>
      <div
        className={`composer-pin${state}`}
        style={{
          left: placement.pin.left,
          top: placement.pin.top,
          transform: `scale(${scale})`,
        }}
        aria-hidden="true"
      >
        <AvatarFace initial={props.initial} flip={placement.pin.flip} />
      </div>
      <div
        ref={card}
        className={`comment-card${state}`}
        role="dialog"
        aria-label={props.label}
        aria-describedby={`${props.testId}-crumb`}
        data-testid={props.testId}
        data-side={placement.side}
        style={{
          left: placement.card.left,
          top: placement.card.top,
          transform: `scale(${scale})`,
          width: CARD_WIDTH,
        }}
        onKeyDown={onCardKey}
        onPointerDown={(event) => event.stopPropagation()}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <p
          className="comment-card-crumb"
          id={`${props.testId}-crumb`}
          data-tip={props.breadcrumb.full}
          data-tip-align="start"
        >
          {props.breadcrumb.short}
        </p>
        <div
          className={`comment-field${leadBox.inline ? " inline" : ""}`}
          onPointerDown={focusField}
        >
          {hasLead && (
            <span ref={leadRef} className="comment-lead">
              {toClaude && (
                <Pill
                  label="@Claude"
                  tone="claude"
                  tip="This goes to Claude"
                  onRemove={() => setToClaude(false)}
                />
              )}
              {mentions.mentions.map((mention) => (
                <Pill
                  key={mentionKey(mention)}
                  icon={mentionIcon(mention)}
                  label={mentionLabel(mention)}
                  full={mentionTitle(mention)}
                  onRemove={() => mentions.remove(mentionKey(mention))}
                />
              ))}
              {images.images.map((image) => (
                <span
                  key={image.key}
                  className={`comment-thumb${image.id ? "" : " loading"}${image.failed ? " failed" : ""}`}
                  data-tip={
                    image.failed ? `${image.name} did not upload` : image.name
                  }
                  data-tip-side="top"
                  data-testid="comment-image"
                >
                  <img src={image.url} alt="" />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Remove ${image.name}`}
                    onClick={() => images.remove(image.key)}
                  >
                    <Icon name="close" size={10} />
                  </button>
                </span>
              ))}
            </span>
          )}
          <textarea
            ref={area}
            className="comment-area"
            style={
              leadBox.inline
                ? { textIndent: leadBox.width + LEAD_GAP }
                : undefined
            }
            rows={1}
            aria-label={props.label}
            placeholder={copy.composer}
            value={text}
            maxLength={2000}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onAreaKey}
            onPaste={onPaste}
          />
        </div>
        {mentions.picker.open && (
          <MentionList
            className="comment-mentions"
            shown={mentions.picker.shown}
            current={mentions.picker.current}
            loading={mentions.loading}
            onPick={mentions.pick}
            onHover={mentions.picker.setActive}
          />
        )}
        <ComposerFoot
          toClaude={toClaude}
          onToClaude={setToClaude}
          blocked={blocked}
          submitting={submitting}
          onSubmit={() => void submit(false)}
          hint={
            props.running && toClaude
              ? { queueOnly: !props.steer || readyImages.length > 0 }
              : null
          }
        />
      </div>
    </>
  );
};
