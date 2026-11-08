import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";

import { AvatarFace, CommentAuthor } from "./comment-avatar.js";
import type { Breadcrumb, CardSide } from "./comment-placement.js";
import { CARD_WIDTH, placeComposer, useCardSize } from "./comment-placement.js";
import { copy } from "./copy.js";
import { Icon, findElement, findElements, useProfileInitial } from "./deps.js";
import type { DesignComment, SelectionContext } from "./deps.js";

type Rect = SelectionContext["rect"];

const MOD_LABEL =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/u.test(navigator.platform)
    ? "⌘"
    : "Ctrl+";

const STATUS_LABEL: Record<DesignComment["status"], string> = {
  draft: "Draft",
  orphaned: "Element not found",
  queued: "Queued",
  resolved: "Resolved",
  sent: "Sent to Claude",
};

interface OpenProps {
  comment: DesignComment;
  anchor: Rect;
  zoom: number;
  frame: { width: number; height: number };
  breadcrumb: Breadcrumb | null;
  initial: string | null;
  busy: boolean;
  onSend: () => void;
  onFix?: () => void;
  onSave: (text: string) => void;
  onResolve: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onClose: () => void;
  onReply: (text: string) => Promise<boolean>;
  onDeleteReply: (replyId: string) => void;
}

const focusables = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) {
    return [];
  }

  return findElements(root, "input, textarea, button:not(:disabled)").filter(
    (element) => element.tabIndex >= 0
  );
};

const trapTab = (event: KeyboardEvent, root: HTMLElement | null): void => {
  if (event.key !== "Tab") {
    return;
  }

  const items = focusables(root);
  const first = items[0];
  const last = items.at(-1);

  if (!first || !last) {
    return;
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const CommentReplies = ({
  comment,
  onDelete,
}: {
  comment: DesignComment;
  onDelete: (replyId: string) => void;
}): ReactElement | null => {
  const initial = useProfileInitial();
  const replies = comment.replies ?? [];

  if (replies.length === 0) {
    return null;
  }

  return (
    <ul
      className="comment-replies"
      aria-label={`Replies to comment ${comment.n}`}
      data-testid="comment-replies"
    >
      {replies.map((reply, index) => (
        <li
          key={reply.id}
          className="comment-reply"
          data-testid="comment-reply"
        >
          <AvatarFace initial={initial} tone="reply" author={reply.author} />
          <span className="comment-reply-text">
            {reply.author && (
              <span className="comment-reply-author">{reply.author}</span>
            )}
            {reply.text}
          </span>
          <button
            type="button"
            className="thread-icon"
            aria-label={`Delete reply ${index + 1} to comment ${comment.n}`}
            onClick={() => onDelete(reply.id)}
          >
            <Icon name="close" size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
};

const GrowingArea = (props: {
  label: string;
  placeholder: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onEnter: () => void;
  className?: string;
}): ReactElement => (
  <textarea
    className={`comment-area ${props.className ?? ""}`}
    rows={1}
    aria-label={props.label}
    placeholder={props.placeholder}
    value={props.value}
    maxLength={2000}
    disabled={props.disabled}
    onChange={(event) => props.onChange(event.target.value)}
    onKeyDown={(event) => {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.nativeEvent.isComposing
      ) {
        return;
      }

      event.preventDefault();
      props.onEnter();
    }}
  />
);

const ReplyBox = ({
  comment,
  onReply,
}: {
  comment: DesignComment;
  onReply: (text: string) => Promise<boolean>;
}): ReactElement => {
  const [text, setText] = useState("");
  const [busy, startTransition] = useTransition();

  const send = (): void => {
    if (busy || text.trim() === "") {
      return;
    }

    startTransition(async () => {
      if (await onReply(text)) {
        setText("");
      }
    });
  };

  return (
    <div className="comment-field reply">
      <GrowingArea
        className="comment-reply-input"
        label={`Reply to comment ${comment.n}`}
        placeholder={copy.reply}
        value={text}
        disabled={busy}
        onChange={setText}
        onEnter={send}
      />
    </div>
  );
};

const OpenCommentPopover = (props: OpenProps): ReactElement => {
  const { comment } = props;
  const [text, setText] = useState(comment.text);
  const root = useRef<HTMLDivElement>(null);
  const side = useRef<CardSide | undefined>(undefined);
  const size = useCardSize(root);
  const editable = comment.status === "queued";
  const changed = text.trim() !== "" && text.trim() !== comment.text;

  useEffect(() => {
    const target =
      (root.current
        ? findElement(root.current, "textarea:not(:disabled)")
        : null) ?? focusables(root.current)[0];

    target?.focus({ preventScroll: true });
  }, [comment.id]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onClose();

      return;
    }

    trapTab(event, root.current);
  };

  const placement = placeComposer(
    props.anchor,
    { card: size, frame: props.frame, zoom: props.zoom },
    side.current,
    comment.drawing ? undefined : comment.target.offset
  );

  side.current = placement.side;
  const scale = 1 / props.zoom;

  let body: ReactNode = <p className="comment-card-text">{comment.text}</p>;

  if (editable) {
    body = (
      <div className="comment-field">
        <GrowingArea
          label={`Edit comment ${comment.n}`}
          placeholder={copy.comment}
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
        <AvatarFace
          initial={props.initial}
          flip={placement.pin.flip}
          tone={comment.status}
          count={comment.replies?.length ?? 0}
          author={comment.author}
        />
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
          transform: `scale(${scale})`,
          width: CARD_WIDTH,
        }}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="thread-head">
          <span className="thread-num">
            {copy.textGlyph2}
            {comment.n}
          </span>
          <CommentAuthor
            author={comment.author}
            viewer={comment.from === "viewer"}
          />
          <span className={`thread-status ${comment.status}`}>
            {STATUS_LABEL[comment.status]}
          </span>
          <span className="spacer" />
          {props.onFix && (
            <button
              type="button"
              className="thread-icon"
              aria-label={copy.fix}
              data-tip={copy.fixTip}
              data-tip-side="top"
              data-testid="comment-fix-open"
              onClick={props.onFix}
            >
              <Icon name="sparkle" size={14} />
            </button>
          )}
          {comment.status !== "resolved" && comment.status !== "sent" && (
            <button
              type="button"
              className="thread-icon"
              aria-label={copy.resolve}
              data-tip={copy.resolve}
              data-tip-side="top"
              onClick={props.onResolve}
            >
              <Icon name="check" size={14} />
            </button>
          )}
          {comment.status === "resolved" && (
            <button
              type="button"
              className="thread-icon"
              aria-label={copy.reopen}
              data-tip={copy.reopen}
              data-tip-side="top"
              onClick={props.onReopen}
            >
              <Icon name="undo" size={14} />
            </button>
          )}
          <button
            type="button"
            className="thread-icon danger"
            aria-label={copy.delete}
            data-tip={copy.delete}
            data-tip-side="top"
            onClick={props.onDelete}
          >
            <Icon name="trash" size={14} />
          </button>
          <button
            type="button"
            className="thread-icon"
            aria-label={copy.close}
            onClick={props.onClose}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
        {props.breadcrumb && (
          <p
            className="comment-card-crumb"
            data-tip={props.breadcrumb.full}
            data-tip-align="start"
          >
            {props.breadcrumb.short}
          </p>
        )}
        {body}
        <CommentReplies comment={comment} onDelete={props.onDeleteReply} />
        <ReplyBox comment={comment} onReply={props.onReply} />
        {editable && (
          <div className="comment-card-foot">
            {changed ? (
              <button
                type="button"
                className="thread-text-btn"
                onClick={() => props.onSave(text.trim())}
              >
                {copy.textSave}
              </button>
            ) : (
              <span className="comment-card-note">
                {copy.textSavedOnTheCanvas}
              </span>
            )}
            <span className="spacer" />
            <button
              type="button"
              className="thread-text-btn primary"
              disabled={props.busy}
              onClick={props.onSend}
            >
              <Icon name="arrowUp" size={13} />
              {copy.textSendToClaude}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export { MOD_LABEL, STATUS_LABEL, trapTab, CommentReplies, OpenCommentPopover };
