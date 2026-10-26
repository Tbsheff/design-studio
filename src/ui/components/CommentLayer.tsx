import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { AnchorQuery, AnchorReport, CommentDrawing, DesignComment, ProjectKind, SelectionContext } from '../../shared/contracts';
import { anchorQueryOf, createOrphanTracker, hasPin } from '../../shared/comments';
import { reviewReport } from '../commentAnchors';
import { postToFrame, useBridge, type BridgeFrame } from '../bridge';
import { isTypingTarget } from '../typingTarget';
import type { CommentsControl } from '../useComments';
import { OpenCommentPopover } from './CommentPopover';
import { CommentComposer, type ComposerSources, type ComposerSubmit } from './CommentComposer';
import { AvatarFace } from './CommentAvatar';
import { breadcrumbOf, pinPlacement, scopeText } from '../commentPlacement';
import { mentionLabel } from './MentionPicker';
import { useProfileInitial } from '../useProfileInitial';
import { DrawingStrokes, PenIcon } from './DrawLayer';
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
  tools: CommentTools;
}

export interface CommentTools {
  sources: ComposerSources;
  pageName: string;
  onSteer?: (text: string) => void;
}

const ORPHAN_GRACE_MS = 1500;
const PIN_SIZE = 28;

function visible(rect: Rect, frame: { width: number; height: number }): boolean {
  return rect.y + rect.height > 0 && rect.y < frame.height && rect.x + rect.width > 0 && rect.x < frame.width;
}

function useShown(control: CommentsControl): DesignComment[] {
  const showResolved = control.showResolved;
  return useMemo(
    () => control.comments.filter((c) => hasPin(c.status) || c.status === 'orphaned' || (showResolved && c.status === 'resolved')),
    [control.comments, showResolved],
  );
}

function openComment(control: CommentsControl): DesignComment | null {
  return control.openId ? (control.comments.find((c) => c.id === control.openId) ?? null) : null;
}

function drawingAnchor(drawing: CommentDrawing): Rect {
  const points = drawing.strokes[0]?.points ?? [];
  const x = points[0] ?? drawing.box.x;
  const y = points[1] ?? drawing.box.y;
  return { x, y: y - PIN_SIZE / 2, width: Math.max(1, drawing.box.x + drawing.box.width - x), height: PIN_SIZE };
}

function focusLater(selector: string): void {
  window.requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());
}

function selectionKey(selection: SelectionContext[]): string {
  return selection.map((s) => s.selector).join('\n');
}

function CommentPin({ comment, rect, frame, zoom, initial, control }: { comment: DesignComment; rect: Rect | undefined; frame: Props['frame']; zoom: number; initial: string | null; control: CommentsControl }) {
  if (!rect || !visible(rect, frame) || control.openId === comment.id) return null;
  const place = pinPlacement(rect, zoom, frame);
  const replies = comment.replies?.length ?? 0;
  const repliesLabel = replies ? `, ${replies} ${replies === 1 ? 'reply' : 'replies'}` : '';
  return (
    <div className={`comment-pin-wrap${place.flip ? ' flip' : ''}`} style={{ left: place.left, top: place.top, transform: `scale(${1 / zoom})` }}>
      <button
        type="button"
        className={`comment-pin ${comment.status}${comment.drawing ? ' has-drawing' : ''}`}
        data-testid="comment-pin"
        data-comment-id={comment.id}
        aria-label={`Comment ${comment.n}${repliesLabel}: ${comment.text}`}
        aria-expanded={false}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => control.setOpenId(comment.id)}
      >
        <AvatarFace initial={initial} flip={place.flip} tone={comment.status} count={replies} />
        {comment.drawing && (
          <span className="pin-pen" aria-hidden="true">
            <PenIcon size={10} />
          </span>
        )}
      </button>
      <span className="comment-pin-tip" role="tooltip">
        <span className="comment-pin-num">#{comment.n}</span> {comment.text}
      </span>
    </div>
  );
}

function drawingCrumb(pageName: string) {
  return { short: `${pageName} › Drawing`, full: `${pageName} › Drawing` };
}

function threadCrumb(comment: DesignComment, pageName: string) {
  if (comment.drawing) return drawingCrumb(pageName);
  return comment.context ? breadcrumbOf(pageName, [comment.context]) : null;
}

function OpenComment({ comment: open, rect: openRect, zoom, frame, control, initial, pageName }: { comment: DesignComment; rect: Rect; zoom: number; frame: Props['frame']; control: CommentsControl; initial: string | null; pageName: string }) {
  return (
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
        onSave={(text) => void control.update(open.id, { text })}
        onResolve={() => {
          control.setOpenId(null);
          void control.update(open.id, { status: 'resolved' });
        }}
        onReopen={() => void control.update(open.id, { status: 'queued' })}
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
}

function withMentions(text: string, mentions: ComposerSubmit['mentions']): string {
  return mentions.length ? `${text} (see ${mentions.map((mention) => `@${mentionLabel(mention)}`).join(', ')})` : text;
}

export function CommentModePill({ mode, control }: { mode: { on: boolean; available: boolean }; control: CommentsControl | undefined }) {
  if (!mode.on || !mode.available) return null;
  const repin = control?.repinId ? control.comments.find((comment) => comment.id === control.repinId) : undefined;
  return (
    <div className="comment-mode-pill" role="status" data-testid="comment-mode-pill">
      {repin ? `Click an element to move comment #${repin.n}` : 'Click an element to comment'}
      <kbd>Esc</kbd>
    </div>
  );
}

export function CommentLayer(props: Props) {
  const { control, frames, zoom, frame } = props;
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [pick, setPick] = useState<SelectionContext | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [feedbackActive, setFeedbackActive] = useState(false);
  const feedbackInput = useRef<HTMLTextAreaElement>(null);
  const initial = useProfileInitial();
  const orphans = useRef(createOrphanTracker(ORPHAN_GRACE_MS));
  const pending = useRef(new Map<string, (contexts: (SelectionContext | null)[]) => void>());
  const recheck = useRef<number | null>(null);
  const retargeted = useRef(new Map<string, string>());
  const live = useRef({ control, commentMode: props.commentMode });
  live.current = { control, commentMode: props.commentMode };

  const shown = useShown(control);
  const tracked = useMemo(() => shown.filter((c) => !c.drawing), [shown]);
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

  const pinned = shown.filter((c) => c.status !== 'orphaned');
  const rectOf = (comment: DesignComment): Rect | undefined => (comment.drawing ? drawingAnchor(comment.drawing) : rects[comment.id]);
  const open = openComment(control);
  const openRect = open ? (open.drawing?.box ?? rects[open.id] ?? null) : null;
  const lastSelected = props.selection[props.selection.length - 1];
  const { tools } = props;

  const finishPick = () => {
    setPick(null);
    focusLater('.comment-toggle');
  };

  const submitFor = (selections: SelectionContext[], finish: () => void) => async (input: ComposerSubmit) => {
    if (input.toClaude && input.now && control.running && input.attachmentIds.length === 0 && tools.onSteer) {
      tools.onSteer(scopeText(breadcrumbOf(tools.pageName, selections), selections, withMentions(input.text, input.mentions)));
      finish();
      return true;
    }
    const ok = await control.add(selections, input.text, input.toClaude, { mentions: input.mentions, attachmentIds: input.attachmentIds });
    if (ok) finish();
    return ok;
  };

  const shared = { zoom, frame, initial, running: control.running, busy: control.sending, sources: tools.sources, images: true, steer: Boolean(tools.onSteer) };
  const many = props.selection.length > 1;

  return (
    <>
      {pinned.map((comment) => (
        <CommentPin key={comment.id} comment={comment} rect={rectOf(comment)} frame={frame} zoom={zoom} initial={initial} control={control} />
      ))}
      {pick && (
        <CommentComposer
          {...shared}
          key={pick.selector}
          label="New comment"
          testId="comment-compose"
          anchor={pick.rect}
          breadcrumb={breadcrumbOf(tools.pageName, [pick])}
          draftKey={`pick:${pick.selector}`}
          autoFocus
          trap
          onSubmit={submitFor([pick], finishPick)}
          onCancel={() => {
            setPick(null);
            focusLater('.stage');
          }}
        />
      )}
      {feedbackOpen && lastSelected && !pick && (
        <CommentComposer
          {...shared}
          key={selKey}
          label={many ? `Comment on ${props.selection.length} elements` : 'Comment on selection'}
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
            focusLater('.stage');
          }}
        />
      )}
      {open && openRect && <OpenComment comment={open} rect={openRect} zoom={zoom} frame={frame} control={control} initial={initial} pageName={tools.pageName} />}
    </>
  );
}
