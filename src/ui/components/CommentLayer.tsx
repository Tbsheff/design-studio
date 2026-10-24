import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { AnchorQuery, AnchorReport, ProjectKind, SelectionContext } from '../../shared/contracts';
import { anchorQueryOf, createOrphanTracker, hasPin } from '../../shared/comments';
import { reviewReport } from '../commentAnchors';
import { postToFrame, useBridge, type BridgeFrame } from '../bridge';
import { isTypingTarget } from '../typingTarget';
import type { CommentsControl } from '../useComments';
import { COMPACT_PLACEMENT, ComposePopover, OpenCommentPopover, popoverStyle } from './CommentPopover';
import '../styles/comments.css';

type Rect = SelectionContext['rect'];

interface FrameSet {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
}

interface Props {
  control: CommentsControl;
  frames: FrameSet;
  kind: ProjectKind;
  zoom: number;
  frame: { width: number; height: number };
  commentMode: boolean;
  selectMode: boolean;
  selection: SelectionContext[];
  onExitCommentMode: () => void;
}

const ORPHAN_GRACE_MS = 1500;
const PIN_SIZE = 24;

function visible(rect: Rect, frame: { width: number; height: number }): boolean {
  return rect.y + rect.height > 0 && rect.y < frame.height && rect.x + rect.width > 0 && rect.x < frame.width;
}

function focusLater(selector: string): void {
  window.requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());
}

function selectionKey(selection: SelectionContext[]): string {
  return selection.map((s) => s.selector).join('\n');
}

export function CommentLayer(props: Props) {
  const { control, frames, zoom, frame } = props;
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [pick, setPick] = useState<SelectionContext | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [feedbackActive, setFeedbackActive] = useState(false);
  const feedbackInput = useRef<HTMLInputElement>(null);
  const orphans = useRef(createOrphanTracker(ORPHAN_GRACE_MS));
  const pending = useRef(new Map<string, (contexts: (SelectionContext | null)[]) => void>());
  const recheck = useRef<number | null>(null);
  const retargeted = useRef(new Map<string, string>());
  const live = useRef({ control, commentMode: props.commentMode });
  live.current = { control, commentMode: props.commentMode };

  const tracked = useMemo(() => control.comments.filter((c) => hasPin(c.status) || c.status === 'orphaned'), [control.comments]);
  const queries = useMemo<AnchorQuery[]>(() => tracked.map(anchorQueryOf), [tracked]);
  const queryKey = JSON.stringify(queries);
  const queriesRef = useRef(queries);
  queriesRef.current = queries;

  const frameOf = useCallback(
    (token: string | null): BridgeFrame | null => {
      const slot = frames.slots.find((s) => s.token === token);
      if (!slot) return null;
      return { key: slot.token, token: slot.token, url: slot.src, kind: props.kind, element: frames.elements.current[slot.token] ?? null };
    },
    [frames.slots, frames.elements, props.kind],
  );
  const frameOfRef = useRef(frameOf);
  frameOfRef.current = frameOf;
  const frontRef = useRef(frames.frontToken);
  frontRef.current = frames.frontToken;

  const readyTokens = useRef(new Set<string>());
  const track = useCallback((frameTarget: BridgeFrame | null) => {
    if (frameTarget && readyTokens.current.has(frameTarget.token)) postToFrame(frameTarget, { type: 'track-anchors', anchors: queriesRef.current });
  }, []);

  useEffect(() => {
    track(frameOf(frames.frontToken));
  }, [queryKey, frames.frontToken, frameOf, track]);

  useEffect(() => {
    setRects({});
  }, [frames.frontToken]);

  useEffect(
    () => () => {
      if (recheck.current !== null) window.clearTimeout(recheck.current);
    },
    [],
  );

  const onReports = useCallback(
    (reports: AnchorReport[]) => {
      const { control: current } = live.current;
      const next: Record<string, Rect> = {};
      let missing = false;
      const state = { orphans: orphans.current, retargeted: retargeted.current, now: Date.now() };
      for (const report of reports) {
        const comment = current.comments.find((c) => c.id === report.id);
        if (!comment) continue;
        if (report.rect) next[report.id] = report.rect;
        const review = reviewReport(comment, report, state);
        if (review.patch) void current.update(comment.id, review.patch);
        missing ||= review.missing;
      }
      setRects(next);
      if (missing && recheck.current === null) {
        recheck.current = window.setTimeout(() => {
          recheck.current = null;
          track(frameOfRef.current(frontRef.current));
        }, ORPHAN_GRACE_MS + 50);
      }
    },
    [track],
  );

  useBridge(
    () => frames.slots.map((slot) => frameOf(slot.token)).filter((f): f is BridgeFrame => f !== null),
    (source, message) => {
      if (message.type === 'ready') {
        readyTokens.current.add(source.token);
        track(source);
        return;
      }
      if (source.token !== frontRef.current) return;
      if (message.type === 'anchor-rects') onReports(message.anchors);
      else if (message.type === 'anchor-contexts') {
        const resolve = pending.current.get(message.requestId);
        pending.current.delete(message.requestId);
        resolve?.(message.contexts);
      } else if (message.type === 'select' && live.current.commentMode) {
        const repinId = live.current.control.repinId;
        if (repinId) {
          void live.current.control.repin(repinId, message.selection);
          props.onExitCommentMode();
        } else {
          setPick(message.selection);
        }
      }
    },
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
        postToFrame(target, { type: 'describe-anchors', requestId, anchors: anchorList });
      });
    return () => {
      control.describeRef.current = null;
    };
  }, [control.describeRef]);

  useEffect(() => {
    if (!props.commentMode) setPick(null);
  }, [props.commentMode]);

  const selKey = selectionKey(props.selection);
  const feedbackOpen =
    !props.commentMode &&
    props.selection.length > 0 &&
    dismissedKey !== selKey &&
    (props.selectMode || feedbackActive) &&
    !(control.composerActive && !feedbackActive) &&
    control.directionId !== null;

  useEffect(() => {
    setFeedbackActive(false);
  }, [selKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.key === 'f' || event.key === 'F') && feedbackOpen) {
        event.preventDefault();
        setFeedbackActive(true);
        feedbackInput.current?.focus();
      } else if (event.key === 'Escape') {
        if (feedbackOpen) setDismissedKey(selKey);
        if (live.current.control.openId) live.current.control.setOpenId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [feedbackOpen, selKey]);

  const scale = 1 / zoom;
  const pinned = tracked.filter((c) => hasPin(c.status));
  const open = control.openId ? (control.comments.find((c) => c.id === control.openId) ?? null) : null;
  const openRect = open ? (rects[open.id] ?? null) : null;
  const lastSelected = props.selection[props.selection.length - 1];

  const finishPick = () => {
    setPick(null);
    focusLater('.comment-toggle');
  };

  return (
    <>
      {pinned.map((comment) => {
        const rect = rects[comment.id];
        if (!rect || !visible(rect, frame)) return null;
        const left = Math.max(0, Math.min(frame.width - PIN_SIZE * scale, rect.x - (PIN_SIZE + 4) * scale));
        const top = Math.max(0, Math.min(frame.height - PIN_SIZE * scale, rect.y));
        return (
          <div key={comment.id} className="comment-pin-wrap" style={{ left, top, transform: `scale(${scale})` }}>
            <button
              type="button"
              className={`comment-pin ${comment.status}`}
              data-testid="comment-pin"
              data-comment-id={comment.id}
              aria-label={`Comment ${comment.n}: ${comment.text}`}
              aria-expanded={control.openId === comment.id}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => control.setOpenId(control.openId === comment.id ? null : comment.id)}
            >
              {comment.n}
            </button>
            <span className="comment-pin-tip" role="tooltip">
              {comment.text}
            </span>
          </div>
        );
      })}
      {pick && (
        <ComposePopover
          key={pick.selector}
          label="Comment"
          hint="Add a comment"
          testId="comment-compose"
          style={popoverStyle(pick.rect, zoom, frame)}
          autoFocus
          trap
          busy={control.sending}
          onQueue={async (text) => {
            const ok = await control.add([pick], text, false);
            if (ok) finishPick();
            return ok;
          }}
          onSendNow={async (text) => {
            const ok = await control.add([pick], text, true);
            if (ok) finishPick();
            return ok;
          }}
          onCancel={finishPick}
        />
      )}
      {feedbackOpen && lastSelected && !pick && (
        <ComposePopover
          key={selKey}
          label={props.selection.length > 1 ? `Feedback on ${props.selection.length} elements` : 'Feedback on selection'}
          hint={props.selection.length > 1 ? `Feedback on ${props.selection.length} elements (F)` : 'Quick feedback (F)'}
          testId="comment-feedback"
          compact
          style={popoverStyle(lastSelected.rect, zoom, frame, COMPACT_PLACEMENT)}
          autoFocus={false}
          trap={false}
          busy={control.sending}
          inputRef={feedbackInput}
          onQueue={async (text) => {
            const ok = await control.add(props.selection, text, false);
            if (ok) setDismissedKey(selKey);
            return ok;
          }}
          onSendNow={async (text) => {
            const ok = await control.add(props.selection, text, true);
            if (ok) setDismissedKey(selKey);
            return ok;
          }}
          onCancel={() => {
            setDismissedKey(selKey);
            feedbackInput.current?.blur();
          }}
        />
      )}
      {open && openRect && (
        <OpenCommentPopover
          key={open.id}
          comment={open}
          style={popoverStyle(openRect, zoom, frame)}
          busy={control.sending}
          onSend={() => {
            control.setOpenId(null);
            void control.send([open.id]);
          }}
          onSave={(text) => void control.update(open.id, { text })}
          onResolve={() => {
            control.setOpenId(null);
            void control.update(open.id, { status: 'resolved' });
          }}
          onDelete={() => void control.remove(open.id)}
          onClose={() => {
            control.setOpenId(null);
            focusLater(`[data-comment-id="${open.id}"]`);
          }}
        />
      )}
    </>
  );
}
