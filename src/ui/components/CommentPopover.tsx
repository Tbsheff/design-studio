import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { DesignComment, SelectionContext } from '../../shared/contracts';
import { CARD_WIDTH, placeComposer, useCardSize, type Breadcrumb, type CardSide } from '../commentPlacement';
import { AvatarFace } from './CommentAvatar';
import { useProfileInitial } from '../useProfileInitial';
import { Icon } from './Icon';

type Rect = SelectionContext['rect'];

export const MOD_LABEL = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('input, textarea, button:not(:disabled)')).filter((element) => element.tabIndex >= 0);
}

export function trapTab(event: KeyboardEvent, root: HTMLElement | null): void {
  if (event.key !== 'Tab') return;
  const items = focusables(root);
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export const STATUS_LABEL: Record<DesignComment['status'], string> = {
  draft: 'Draft',
  queued: 'Queued',
  sent: 'Sent to Claude',
  resolved: 'Resolved',
  orphaned: 'Element not found',
};

export function CommentReplies({ comment, onDelete }: { comment: DesignComment; onDelete: (replyId: string) => void }) {
  const initial = useProfileInitial();
  const replies = comment.replies ?? [];
  if (replies.length === 0) return null;
  return (
    <ul className="comment-replies" aria-label={`Replies to comment ${comment.n}`} data-testid="comment-replies">
      {replies.map((reply, index) => (
        <li key={reply.id} className="comment-reply" data-testid="comment-reply">
          <AvatarFace initial={initial} tone="reply" />
          <span className="comment-reply-text">{reply.text}</span>
          <button type="button" className="thread-icon" aria-label={`Delete reply ${index + 1} to comment ${comment.n}`} onClick={() => onDelete(reply.id)}>
            <Icon name="close" size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function GrowingArea(props: {
  label: string;
  placeholder: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onEnter: () => void;
  className?: string;
}) {
  return (
    <textarea
      className={`comment-area ${props.className ?? ''}`}
      rows={1}
      aria-label={props.label}
      placeholder={props.placeholder}
      value={props.value}
      maxLength={2000}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
        event.preventDefault();
        props.onEnter();
      }}
    />
  );
}

function ReplyBox({ comment, onReply }: { comment: DesignComment; onReply: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = () => {
    if (busy || text.trim() === '') return;
    setBusy(true);
    void onReply(text).then((ok) => {
      setBusy(false);
      if (ok) setText('');
    });
  };
  return (
    <div className="comment-field reply">
      <GrowingArea
        className="comment-reply-input"
        label={`Reply to comment ${comment.n}`}
        placeholder="Reply…"
        value={text}
        disabled={busy}
        onChange={setText}
        onEnter={send}
      />
    </div>
  );
}

interface OpenProps {
  comment: DesignComment;
  anchor: Rect;
  zoom: number;
  frame: { width: number; height: number };
  breadcrumb: Breadcrumb | null;
  initial: string | null;
  busy: boolean;
  onSend: () => void;
  onSave: (text: string) => void;
  onResolve: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onClose: () => void;
  onReply: (text: string) => Promise<boolean>;
  onDeleteReply: (replyId: string) => void;
}

export function OpenCommentPopover(props: OpenProps) {
  const { comment } = props;
  const [text, setText] = useState(comment.text);
  const root = useRef<HTMLDivElement>(null);
  const side = useRef<CardSide | undefined>(undefined);
  const size = useCardSize(root);
  const editable = comment.status === 'queued';
  const changed = text.trim() !== '' && text.trim() !== comment.text;

  useEffect(() => {
    const target = root.current?.querySelector<HTMLTextAreaElement>('textarea:not(:disabled)') ?? focusables(root.current)[0];
    target?.focus({ preventScroll: true });
  }, [comment.id]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      props.onClose();
      return;
    }
    trapTab(event, root.current);
  };

  const placement = placeComposer(props.anchor, props.zoom, props.frame, size, side.current);
  side.current = placement.side;
  const scale = 1 / props.zoom;

  let body: ReactNode = <p className="comment-card-text">{comment.text}</p>;
  if (editable) {
    body = (
      <div className="comment-field">
        <GrowingArea
          label={`Edit comment ${comment.n}`}
          placeholder="Comment"
          value={text}
          onChange={setText}
          onEnter={() => changed && props.onSave(text.trim())}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className="composer-pin"
        style={{
          left: placement.pin.left,
          top: placement.pin.top,
          transform: `scale(${scale})`,
        }}
        aria-hidden="true"
      >
        <AvatarFace initial={props.initial} flip={placement.pin.flip} tone={comment.status} count={comment.replies?.length ?? 0} />
      </div>
      <div
        ref={root}
        className="comment-card thread"
        role="dialog"
        aria-label={`Comment ${comment.n}`}
        data-testid="comment-open"
        data-side={placement.side}
        style={{
          left: placement.card.left,
          top: placement.card.top,
          width: CARD_WIDTH,
          transform: `scale(${scale})`,
        }}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="thread-head">
          <span className="thread-num">#{comment.n}</span>
          <span className={`thread-status ${comment.status}`}>{STATUS_LABEL[comment.status]}</span>
          <span className="spacer" />
          {comment.status !== 'resolved' && comment.status !== 'sent' && (
            <button type="button" className="thread-icon" aria-label="Resolve" data-tip="Resolve" data-tip-side="top" onClick={props.onResolve}>
              <Icon name="check" size={14} />
            </button>
          )}
          {comment.status === 'resolved' && (
            <button type="button" className="thread-icon" aria-label="Reopen" data-tip="Reopen" data-tip-side="top" onClick={props.onReopen}>
              <Icon name="undo" size={14} />
            </button>
          )}
          <button type="button" className="thread-icon danger" aria-label="Delete" data-tip="Delete" data-tip-side="top" onClick={props.onDelete}>
            <Icon name="trash" size={14} />
          </button>
          <button type="button" className="thread-icon" aria-label="Close comment" onClick={props.onClose}>
            <Icon name="close" size={14} />
          </button>
        </div>
        {props.breadcrumb && (
          <p className="comment-card-crumb" title={props.breadcrumb.full}>
            {props.breadcrumb.short}
          </p>
        )}
        {body}
        <CommentReplies comment={comment} onDelete={props.onDeleteReply} />
        <ReplyBox comment={comment} onReply={props.onReply} />
        {editable && (
          <div className="comment-card-foot">
            {changed ? (
              <button type="button" className="thread-text-btn" onClick={() => props.onSave(text.trim())}>
                Save
              </button>
            ) : (
              <span className="comment-card-note">Saved on the canvas</span>
            )}
            <span className="spacer" />
            <button type="button" className="thread-text-btn primary" disabled={props.busy} onClick={props.onSend}>
              <Icon name="arrowUp" size={13} />
              Send to Claude
            </button>
          </div>
        )}
      </div>
    </>
  );
}
