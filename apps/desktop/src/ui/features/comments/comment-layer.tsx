import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { reviewReport, onActiveFrame } from "./comment-anchors.js";
import type { ActiveFrame } from "./comment-anchors.js";
import { AvatarFace } from "./comment-avatar.js";
import { CommentComposer } from "./comment-composer.js";
import type { ComposerSubmit, ComposerSources } from "./comment-composer.js";
import {
  breadcrumbOf,
  scopeText,
  offsetIn,
  pinPlacement,
} from "./comment-placement.js";
import type { PinOffset } from "./comment-placement.js";
import { OpenCommentPopover } from "./comment-popover.js";
import { ChatPickBar } from "./comments-panel.js";
import {
  INLINE_PROMPT_OPEN_EVENT,
  anchorQueryOf,
  createOrphanTracker,
  isTypingTarget,
  postToFrame,
  useBridge,
  useProfileInitial,
  PenIcon,
  canPickForChat,
  hasPin,
  mentionLabel,
  DrawingStrokes,
  createLiveStore,
  findElement,
  useLive,
} from "./deps.js";
import type {
  DesignComment,
  SelectionContext,
  ProjectKind,
  AnchorQuery,
  AnchorReport,
  BridgeFrame,
  CommentDrawing,
} from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

const ORPHAN_GRACE_MS = 1500;

const ADDED_MS = 2400;

let addedTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

const justAddedStore = createLiveStore(false);

const markAdded = (): void => {
  if (addedTimer !== null) {
    globalThis.clearTimeout(addedTimer);
  }

  justAddedStore.set(true);
  addedTimer = globalThis.setTimeout(() => {
    addedTimer = null;
    justAddedStore.set(false);
  }, ADDED_MS);
};

const openComment = (control: CommentsControl): DesignComment | null =>
  control.openId
    ? (control.comments.find((c) => c.id === control.openId) ?? null)
    : null;

const PIN_SIZE = 28;

type Rect = SelectionContext["rect"];

const drawingAnchor = (drawing: CommentDrawing): Rect => {
  const points = drawing.strokes[0]?.points ?? [];
  const x = points[0] ?? drawing.box.x;
  const y = points[1] ?? drawing.box.y;

  return {
    height: PIN_SIZE,
    width: Math.max(1, drawing.box.x + drawing.box.width - x),
    x,
    y: y - PIN_SIZE / 2,
  };
};

const selectionKey = (selection: SelectionContext[]): string =>
  selection.map((s) => s.selector).join("\n");

const KEY_MARK = "\n";

const toActiveFrame = (key: string): ActiveFrame | null => {
  if (key === "") {
    return null;
  }

  const [id = "", path = "", ...ids] = key.split(KEY_MARK);

  return { id, ids, path };
};

const useShown = (
  control: CommentsControl,
  active: ActiveFrame | undefined
): DesignComment[] => {
  const { showResolved } = control;

  const activeKey = active
    ? [active.id, active.path, ...active.ids].join(KEY_MARK)
    : "";

  return useMemo(() => {
    const frame = toActiveFrame(activeKey);

    return control.comments.filter(
      (c) =>
        (hasPin(c.status) ||
          c.status === "orphaned" ||
          (showResolved && c.status === "resolved")) &&
        (!frame || onActiveFrame(c, frame))
    );
  }, [control.comments, showResolved, activeKey]);
};

const LABEL_MAX_H = 96;

const pinTarget = (
  comment: DesignComment,
  rect: Rect,
  zoom: number,
  frame: { width: number }
): { rect: Rect; offset?: PinOffset } => {
  if (comment.drawing) {
    return { rect };
  }

  if (rect.height > LABEL_MAX_H) {
    return { offset: comment.target.offset, rect };
  }

  const fitsRight = rect.x + rect.width + PIN_SIZE / zoom <= frame.width;

  return fitsRight
    ? { rect }
    : { rect: { ...rect, width: 1, x: rect.x + rect.width - 1 } };
};

const visible = (
  rect: Rect,
  frame: { width: number; height: number }
): boolean =>
  rect.y + rect.height > 0 &&
  rect.y < frame.height &&
  rect.x + rect.width > 0 &&
  rect.x < frame.width;

const pinClick = (
  control: CommentsControl,
  comment: DesignComment,
  event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }
): void => {
  const multi = event.shiftKey || event.metaKey || event.ctrlKey;

  if (multi && canPickForChat(comment.status)) {
    control.togglePick(comment.id);
  } else {
    control.setOpenId(comment.id);
  }
};

interface FrameSet {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
}

export interface CommentTools {
  sources: ComposerSources;
  pageName: string;
  onSteer?: (text: string) => void;
}

export interface Props {
  control: CommentsControl;
  frames: FrameSet;
  kind: ProjectKind;
  zoom: number;
  frame: { width: number; height: number };
  commentMode: boolean;
  selectMode: boolean;
  editing?: boolean;
  selection: SelectionContext[];
  onExitCommentMode: () => void;
  tools: CommentTools;
  activeFrame?: ActiveFrame;
}

const CommentPin = ({
  comment,
  rect,
  frame,
  zoom,
  initial,
  control,
}: {
  comment: DesignComment;
  rect: Rect | undefined;
  frame: Props["frame"];
  zoom: number;
  initial: string | null;
  control: CommentsControl;
}) => {
  if (!rect || !visible(rect, frame) || control.openId === comment.id) {
    return null;
  }

  const pin = pinTarget(comment, rect, zoom, frame);
  const place = pinPlacement(pin.rect, zoom, frame, pin.offset);
  const replies = comment.replies?.length ?? 0;

  const repliesLabel = replies
    ? `, ${replies} ${replies === 1 ? "reply" : "replies"}`
    : "";

  return (
    <div
      className={`comment-pin-wrap${place.flip ? " flip" : ""}`}
      style={{
        left: place.left,
        top: place.top,
        transform: `scale(${1 / zoom})`,
      }}
    >
      <button
        type="button"
        className={`comment-pin ${comment.status}${comment.drawing ? " has-drawing" : ""}${control.picked.includes(comment.id) ? " picked" : ""}`}
        data-testid="comment-pin"
        data-comment-id={comment.id}
        aria-label={`Comment ${comment.n}${comment.author ? ` by ${comment.author}` : ""}${repliesLabel}: ${comment.text}`}
        aria-expanded={false}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => pinClick(control, comment, event)}
      >
        <AvatarFace
          initial={initial}
          flip={place.flip}
          tone={comment.status}
          count={replies}
          author={comment.author}
        />
        {comment.drawing && (
          <span className="pin-pen" aria-hidden="true">
            <PenIcon size={10} />
          </span>
        )}
      </button>
      <span className="comment-pin-tip" role="tooltip">
        <span className="comment-pin-num">#{comment.n}</span>{" "}
        {comment.author && (
          <span className="comment-pin-author">{comment.author}:</span>
        )}{" "}
        {comment.text}
      </span>
    </div>
  );
};

const withMentions = (
  text: string,
  mentions: ComposerSubmit["mentions"]
): string =>
  mentions.length > 0
    ? `${text} (see ${mentions.map((mention) => `@${mentionLabel(mention)}`).join(", ")})`
    : text;

const usePick = () => {
  const [picked, setPicked] = useState<{
    selection: SelectionContext;
    offset?: PinOffset;
  } | null>(null);

  const setPick = useCallback(
    (selection: SelectionContext | null, offset?: PinOffset) =>
      setPicked(selection ? { offset, selection } : null),
    []
  );

  return {
    pick: picked?.selection ?? null,
    pickOffset: picked?.offset,
    setPick,
  };
};

const focusLater = (selector: string): void => {
  globalThis.requestAnimationFrame(() =>
    findElement(document.body, selector)?.focus()
  );
};

const drawingCrumb = (pageName: string) => ({
  full: `${pageName} › Drawing`,
  short: `${pageName} › Drawing`,
});

const threadCrumb = (comment: DesignComment, pageName: string) => {
  if (comment.drawing) {
    return drawingCrumb(pageName);
  }

  return comment.context ? breadcrumbOf(pageName, [comment.context]) : null;
};

const OpenComment = ({
  comment: open,
  rect: openRect,
  zoom,
  frame,
  control,
  initial,
  pageName,
}: {
  comment: DesignComment;
  rect: Rect;
  zoom: number;
  frame: Props["frame"];
  control: CommentsControl;
  initial: string | null;
  pageName: string;
}) => (
  <>
    {open.drawing && <DrawingStrokes drawing={open.drawing} />}
    <OpenCommentPopover
      key={open.id}
      comment={open}
      anchor={openRect}
      zoom={zoom}
      frame={frame}
      breadcrumb={threadCrumb(open, pageName)}
      initial={initial}
      busy={control.sending}
      onSend={() => {
        control.setOpenId(null);
        void control.send([open.id]);
      }}
      onFix={
        canPickForChat(open.status)
          ? () => {
              control.setOpenId(null);
              void control.toChat([open.id]);
            }
          : undefined
      }
      onSave={(text) => void control.update(open.id, { text })}
      onResolve={() => {
        control.setOpenId(null);
        void control.update(open.id, { status: "resolved" });
      }}
      onReopen={() => void control.update(open.id, { status: "queued" })}
      onReply={(text) => control.reply(open.id, text)}
      onDeleteReply={(replyId) => void control.removeReply(open.id, replyId)}
      onDelete={() => void control.remove(open.id)}
      onClose={() => {
        control.setOpenId(null);
        focusLater(`[data-comment-id="${open.id}"]`);
      }}
    />
  </>
);

export const CommentLayer = (props: Props) => {
  const { control, frames, zoom, frame } = props;
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const { pick, pickOffset, setPick } = usePick();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [feedbackActive, setFeedbackActive] = useState(false);
  const feedbackInput = useRef<HTMLTextAreaElement>(null);
  const initial = useProfileInitial();
  const orphans = useRef(createOrphanTracker(ORPHAN_GRACE_MS));

  const pending = useRef(
    new Map<string, (contexts: (SelectionContext | null)[]) => void>()
  );

  const recheck = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retargeted = useRef(new Map<string, string>());
  const live = useRef({ commentMode: props.commentMode, control });
  live.current = { commentMode: props.commentMode, control };

  const shown = useShown(control, props.activeFrame);
  const tracked = useMemo(() => shown.filter((c) => !c.drawing), [shown]);

  const queries = useMemo<AnchorQuery[]>(
    () => tracked.map(anchorQueryOf),
    [tracked]
  );

  const queryKey = JSON.stringify(queries);
  const queriesRef = useRef(queries);
  queriesRef.current = queries;

  const frameOf = useCallback(
    (token: string | null): BridgeFrame | null => {
      const slot = frames.slots.find((s) => s.token === token);

      if (!slot) {
        return null;
      }

      return {
        element: frames.elements.current[slot.token] ?? null,
        key: slot.token,
        kind: props.kind,
        token: slot.token,
        url: slot.src,
      };
    },
    [frames.slots, frames.elements, props.kind]
  );

  const frameOfRef = useRef(frameOf);
  frameOfRef.current = frameOf;
  const frontRef = useRef(frames.frontToken);
  frontRef.current = frames.frontToken;

  const readyTokens = useRef(new Set<string>());

  const track = useCallback((frameTarget: BridgeFrame | null) => {
    if (frameTarget && readyTokens.current.has(frameTarget.token)) {
      postToFrame(frameTarget, {
        anchors: queriesRef.current,
        type: "track-anchors",
      });
    }
  }, []);

  useEffect(() => {
    track(frameOf(frames.frontToken));
  }, [queryKey, frames.frontToken, frameOf, track]);

  useEffect(() => {
    setRects({});
    orphans.current = createOrphanTracker(ORPHAN_GRACE_MS);
  }, [frames.frontToken]);

  useEffect(
    () => () => {
      if (recheck.current !== null) {
        globalThis.clearTimeout(recheck.current);
      }
    },
    []
  );

  const onReports = useCallback(
    (reports: AnchorReport[]) => {
      const { control: current } = live.current;
      const next: Record<string, Rect> = {};
      let missing = false;

      const state = {
        now: Date.now(),
        orphans: orphans.current,
        retargeted: retargeted.current,
      };

      for (const report of reports) {
        const comment = current.comments.find((c) => c.id === report.id);

        if (!comment) {
          continue;
        }

        if (report.rect) {
          next[report.id] = report.rect;
        }

        const review = reviewReport(comment, report, state);

        if (review.patch) {
          void current.update(comment.id, review.patch);
        }

        missing ||= review.missing;
      }

      setRects(next);

      if (missing && recheck.current === null) {
        recheck.current = globalThis.setTimeout(() => {
          recheck.current = null;
          track(frameOfRef.current(frontRef.current));
        }, ORPHAN_GRACE_MS + 50);
      }
    },
    [track]
  );

  useBridge(
    () =>
      frames.slots
        .map((slot) => frameOf(slot.token))
        .filter((f): f is BridgeFrame => f !== null),
    (source, message) => {
      if (message.type === "ready") {
        readyTokens.current.add(source.token);
        track(source);

        return;
      }

      if (source.token !== frontRef.current) {
        return;
      }

      if (message.type === "anchor-rects") {
        onReports(message.anchors);
      } else if (message.type === "anchor-contexts") {
        const resolve = pending.current.get(message.requestId);
        pending.current.delete(message.requestId);
        resolve?.(message.contexts);
      } else if (message.type === "select" && live.current.commentMode) {
        const { repinId } = live.current.control;

        if (repinId) {
          void live.current.control.repin(
            repinId,
            message.selection,
            offsetIn(message.selection.rect, message.point)
          );
          props.onExitCommentMode();
        } else {
          setPick(
            message.selection,
            offsetIn(message.selection.rect, message.point)
          );
        }
      }
    }
  );

  useEffect(() => {
    control.describeRef.current = (anchorList) =>
      new Promise((resolve) => {
        const target = frameOfRef.current(frontRef.current);

        if (!target) {
          resolve([]);

          return;
        }

        const requestId = Math.random().toString(36).slice(2);
        pending.current.set(requestId, resolve);
        postToFrame(target, {
          anchors: anchorList,
          requestId,
          type: "describe-anchors",
        });
      });

    return () => {
      control.describeRef.current = null;
    };
  }, [control.describeRef]);

  useEffect(() => {
    if (!props.commentMode) {
      setPick(null);
    }
  }, [props.commentMode]);

  const selKey = selectionKey(props.selection);

  const feedbackOpen =
    !props.commentMode &&
    props.selection.length > 0 &&
    dismissedKey !== selKey &&
    ((props.selectMode && !props.editing) || feedbackActive) &&
    !(control.composerActive && !feedbackActive) &&
    control.directionId !== null;

  useEffect(() => {
    setFeedbackActive(false);
  }, [selKey]);

  useEffect(() => {
    const hide = () => setDismissedKey(selKey);
    globalThis.addEventListener(INLINE_PROMPT_OPEN_EVENT, hide);

    return () => globalThis.removeEventListener(INLINE_PROMPT_OPEN_EVENT, hide);
  }, [selKey]);

  const modeKey = `${props.commentMode}:${props.selectMode}:${props.editing}`;
  const lastMode = useRef(modeKey);
  useEffect(() => {
    if (lastMode.current === modeKey) {
      return;
    }

    lastMode.current = modeKey;
    setDismissedKey(selKey);
  }, [modeKey, selKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        isTypingTarget(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      if ((event.key === "f" || event.key === "F") && feedbackOpen) {
        event.preventDefault();
        setFeedbackActive(true);
        feedbackInput.current?.focus();
      } else if (event.key === "Escape") {
        if (feedbackOpen) {
          setDismissedKey(selKey);
        }

        if (live.current.control.openId) {
          live.current.control.setOpenId(null);
        }
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return () => globalThis.removeEventListener("keydown", onKey);
  }, [feedbackOpen, selKey]);

  const pinned = shown.filter((c) => c.status !== "orphaned");

  const rectOf = (comment: DesignComment): Rect | undefined =>
    comment.drawing ? drawingAnchor(comment.drawing) : rects[comment.id];

  const open = openComment(control);
  const openRect = open ? (open.drawing?.box ?? rects[open.id] ?? null) : null;
  const lastSelected = props.selection.at(-1);
  const { tools } = props;

  const finishPick = () => {
    setPick(null);
    focusLater(".stage");
  };

  const submitFor =
    (selections: SelectionContext[], finish: () => void, offset?: PinOffset) =>
    async (input: ComposerSubmit) => {
      if (
        input.toClaude &&
        input.now &&
        control.running &&
        input.attachmentIds.length === 0 &&
        tools.onSteer
      ) {
        tools.onSteer(
          scopeText(
            breadcrumbOf(tools.pageName, selections),
            selections,
            withMentions(input.text, input.mentions)
          )
        );
        finish();

        return true;
      }

      const ok = await control.add(selections, input.text, input.toClaude, {
        attachmentIds: input.attachmentIds,
        mentions: input.mentions,
        ...(offset ? { offset } : {}),
      });

      if (ok) {
        markAdded();
        finish();
      }

      return ok;
    };

  const shared = {
    busy: control.sending,
    frame,
    images: true,
    initial,
    running: control.running,
    sources: tools.sources,
    steer: Boolean(tools.onSteer),
    zoom,
  };

  const many = props.selection.length > 1;

  return (
    <>
      {pinned.map((comment) => (
        <CommentPin
          key={comment.id}
          comment={comment}
          rect={rectOf(comment)}
          frame={frame}
          zoom={zoom}
          initial={initial}
          control={control}
        />
      ))}
      {pick && (
        <CommentComposer
          {...shared}
          key={pick.selector}
          label="New comment"
          testId="comment-compose"
          anchor={pick.rect}
          offset={pickOffset}
          breadcrumb={breadcrumbOf(tools.pageName, [pick])}
          draftKey={`pick:${pick.selector}`}
          autoFocus
          trap
          onSubmit={submitFor([pick], finishPick, pickOffset)}
          onCancel={() => {
            setPick(null);
            focusLater(".stage");
          }}
        />
      )}
      {feedbackOpen && lastSelected && !pick && (
        <CommentComposer
          {...shared}
          key={selKey}
          label={
            many
              ? `Comment on ${props.selection.length} elements`
              : "Comment on selection"
          }
          testId="comment-feedback"
          anchor={lastSelected.rect}
          breadcrumb={breadcrumbOf(tools.pageName, props.selection)}
          draftKey={`sel:${selKey}`}
          autoFocus={feedbackActive}
          trap={feedbackActive}
          focusRef={feedbackInput}
          onSubmit={submitFor(props.selection, () => setDismissedKey(selKey))}
          onCancel={() => {
            setDismissedKey(selKey);
            focusLater(".stage");
          }}
        />
      )}
      {open && openRect && (
        <OpenComment
          comment={open}
          rect={openRect}
          zoom={zoom}
          frame={frame}
          control={control}
          initial={initial}
          pageName={tools.pageName}
        />
      )}
    </>
  );
};

const useJustAdded = (): boolean => useLive(justAddedStore);

export const CommentModePill = ({
  mode,
  control,
}: {
  mode: { on: boolean; available: boolean };
  control: CommentsControl | undefined;
}) => {
  const added = useJustAdded();

  if (added && mode.available) {
    return (
      <div
        className="comment-mode-pill"
        role="status"
        data-testid="comment-added"
      >
        Comment added
      </div>
    );
  }

  if (!mode.on || !mode.available) {
    return null;
  }

  const repin = control?.repinId
    ? control.comments.find((comment) => comment.id === control.repinId)
    : undefined;

  return (
    <>
      <div
        className="comment-mode-pill"
        role="status"
        data-testid="comment-mode-pill"
      >
        {repin
          ? `Click an element to move comment #${repin.n}`
          : "Click to comment, Shift-click pins to select, P to draw"}
      </div>
      {control && <ChatPickBar control={control} className="floating" />}
    </>
  );
};
