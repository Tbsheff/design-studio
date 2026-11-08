import type { ReactElement } from "react";
import { useCallback } from "react";

import { AvatarFace } from "./comment-avatar.js";
import { Icon } from "./deps.js";
import type { DesignComment } from "./deps.js";

type Reply = NonNullable<DesignComment["replies"]>[number];

const CommentReply = ({
  index,
  initial,
  number,
  onDelete,
  reply,
}: {
  index: number;
  initial: string | null;
  number: number;
  onDelete: (replyId: string) => void;
  reply: Reply;
}): ReactElement => {
  const replyId = reply.id;

  const remove = useCallback(
    (): void => onDelete(replyId),
    [onDelete, replyId]
  );

  return (
    <li className="comment-reply" data-testid="comment-reply">
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
        aria-label={`Delete reply ${index + 1} to comment ${number}`}
        onClick={remove}
      >
        <Icon name="close" size={12} />
      </button>
    </li>
  );
};

export { CommentReply };
