import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import type { DesignComment, SelectionContext } from '../../shared/contracts';
import { Icon } from './Icon';

type Rect = SelectionContext['rect'];

const POP_WIDTH = 288;
const POP_HEIGHT = 112;
const GAP = 8;
const COMPACT_WIDTH = 460;
const COMPACT_HEIGHT = 44;

export const MOD_LABEL = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

interface PopoverPlacement {
  align?: 'start' | 'end';
  width?: number;
  height?: number;
}

export const COMPACT_PLACEMENT: PopoverPlacement = { align: 'end', width: COMPACT_WIDTH, height: COMPACT_HEIGHT };

export function popoverStyle(rect: Rect, zoom: number, frame: { width: number; height: number }, placement: PopoverPlacement = {}): CSSProperties {
  const scale = 1 / zoom;
  const popWidth = placement.width ?? POP_WIDTH;
  const width = popWidth * scale;
  const height = (placement.height ?? POP_HEIGHT) * scale;
  const below = rect.y + rect.height + GAP * scale;
  const fitsBelow = below + height <= frame.height || rect.y - GAP * scale - height < 0;
  const anchorX = placement.align === 'end' ? rect.x + rect.width - width : rect.x;
  const left = Math.max(0, Math.min(anchorX, frame.width - width));
  const top = fitsBelow ? Math.min(below, Math.max(0, frame.height - height)) : rect.y - GAP * scale - height;
  return { left, top: Math.max(0, top), width: popWidth, transform: `scale(${scale})` };
}

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('input, textarea, button:not(:disabled)'));
}

function trapTab(event: KeyboardEvent, root: HTMLElement | null): void {
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

interface ComposeProps {
  label: string;
  hint: string;
  style: CSSProperties;
  autoFocus: boolean;
  trap: boolean;
  busy: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onQueue: (text: string) => Promise<boolean>;
  onSendNow: (text: string) => Promise<boolean>;
  onCancel: () => void;
  testId: string;
  compact?: boolean;
}

export function ComposePopover(props: ComposeProps) {
  const [text, setText] = useState('');
  const own = useRef<HTMLInputElement>(null);
  const input = props.inputRef ?? own;
  const root = useRef<HTMLDivElement>(null);
  const empty = text.trim() === '';

  useEffect(() => {
    if (props.autoFocus) input.current?.focus();
  }, [props.autoFocus, input]);

  const submit = async (sendNow: boolean) => {
    if (empty || props.busy) return;
    const ok = await (sendNow ? props.onSendNow(text) : props.onQueue(text));
    if (ok) setText('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      props.onCancel();
      return;
    }
    if (props.trap) trapTab(event, root.current);
  };

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit(event.metaKey || event.ctrlKey);
  };

  return (
    <div
      ref={root}
      className={`comment-pop ${props.compact ? 'compact' : ''}`}
      role="dialog"
      aria-label={props.label}
      data-testid={props.testId}
      style={props.style}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <input
        ref={input}
        className="input comment-input"
        aria-label={props.label}
        placeholder={props.hint}
        value={text}
        maxLength={2000}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onInputKey}
      />
      <div className="comment-pop-actions">
        <button
          type="button"
          className="btn small"
          disabled={empty || props.busy}
          aria-keyshortcuts="Meta+Enter Control+Enter"
          onClick={() => void submit(true)}
        >
          Send now <kbd>{MOD_LABEL}↵</kbd>
        </button>
        <button type="button" className="btn small primary" disabled={empty || props.busy} aria-keyshortcuts="Enter" onClick={() => void submit(false)}>
          Add to queue <kbd>↵</kbd>
        </button>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<DesignComment['status'], string> = {
  draft: 'Draft',
  queued: 'Queued',
  sent: 'Sent to agent',
  resolved: 'Resolved',
  orphaned: 'Element not found',
};

interface OpenProps {
  comment: DesignComment;
  style: CSSProperties;
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

export function CommentReplies({ comment, onDelete }: { comment: DesignComment; onDelete: (replyId: string) => void }) {
  const replies = comment.replies ?? [];
  if (replies.length === 0) return null;
  return (
    <ul className="comment-replies" aria-label={`Replies to comment ${comment.n}`} data-testid="comment-replies">
      {replies.map((reply, index) => (
        <li key={reply.id} className="comment-reply" data-testid="comment-reply">
          <span className="comment-reply-text">{reply.text}</span>
          <button type="button" className="icon-btn small" aria-label={`Delete reply ${index + 1} to comment ${comment.n}`} onClick={() => onDelete(reply.id)}>
            <Icon name="close" size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ReplyInput({ comment, onReply }: { comment: DesignComment; onReply: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <input
      className="input comment-input comment-reply-input"
      aria-label={`Reply to comment ${comment.n}`}
      placeholder="Reply"
      value={text}
      maxLength={2000}
      disabled={busy}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing || text.trim() === '') return;
        event.preventDefault();
        setBusy(true);
        void onReply(text).then((ok) => {
          setBusy(false);
          if (ok) setText('');
        });
      }}
    />
  );
}

export function OpenCommentPopover({ comment, style, busy, onSend, onSave, onResolve, onReopen, onDelete, onClose, onReply, onDeleteReply }: OpenProps) {
  const [text, setText] = useState(comment.text);
  const root = useRef<HTMLDivElement>(null);
  const editable = comment.status === 'queued';
  const changed = text.trim() !== '' && text.trim() !== comment.text;

  useEffect(() => {
    focusables(root.current)[0]?.focus();
  }, [comment.id]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    trapTab(event, root.current);
  };

  let body: ReactNode = <p className="comment-pop-text">{comment.text}</p>;
  if (editable) {
    body = (
      <input
        className="input comment-input"
        aria-label={`Edit comment ${comment.n}`}
        value={text}
        maxLength={2000}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !changed) return;
          event.preventDefault();
          onSave(text.trim());
        }}
      />
    );
  }

  return (
    <div
      ref={root}
      className="comment-pop"
      role="dialog"
      aria-label={`Comment ${comment.n}`}
      data-testid="comment-open"
      style={style}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="comment-pop-head">
        <span className="comment-num" aria-hidden="true">
          {comment.n}
        </span>
        <span className="comment-pop-status">{STATUS_LABEL[comment.status]}</span>
        <button type="button" className="icon-btn small comment-pop-close" aria-label="Close comment" onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </div>
      {body}
      <CommentReplies comment={comment} onDelete={onDeleteReply} />
      <ReplyInput comment={comment} onReply={onReply} />
      <div className="comment-pop-actions">
        <button type="button" className="btn small ghost danger" onClick={onDelete}>
          Delete
        </button>
        <div className="spacer" />
        {comment.status !== 'resolved' && comment.status !== 'sent' && (
          <button type="button" className="btn small" onClick={onResolve}>
            Resolve
          </button>
        )}
        {comment.status === 'resolved' && (
          <button type="button" className="btn small" onClick={onReopen}>
            Reopen
          </button>
        )}
        {editable && changed && (
          <button type="button" className="btn small" onClick={() => onSave(text.trim())}>
            Save
          </button>
        )}
        {editable && (
          <button type="button" className="btn small primary" disabled={busy} onClick={onSend}>
            Send now
          </button>
        )}
      </div>
    </div>
  );
}
