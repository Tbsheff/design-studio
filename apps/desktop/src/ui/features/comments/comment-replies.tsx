import type { ReactElement } from "react";

import { CommentReply } from "./comment-reply.js";
import { useProfileInitial } from "./deps.js";
import type { DesignComment } from "./deps.js";

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
        <CommentReply
          key={reply.id}
          index={index}
          initial={initial}
          number={comment.n}
          onDelete={onDelete}
          reply={reply}
        />
      ))}
    </ul>
  );
};

export { CommentReplies };
