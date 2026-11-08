import type { ReactElement } from "react";
import { useCallback } from "react";

import { CommentReplies } from "./comment-replies.js";
import type { DesignComment } from "./deps.js";
import { fire } from "./fire.js";
import type { CommentsControl } from "./use-comments.js";

const RowReplies = ({
  comment,
  control,
}: {
  comment: DesignComment;
  control: CommentsControl;
}): ReactElement | null => {
  const { removeReply } = control;

  const deleteReply = useCallback(
    (replyId: string): void => {
      fire(() => removeReply(comment.id, replyId));
    },
    [comment.id, removeReply]
  );

  return <CommentReplies comment={comment} onDelete={deleteReply} />;
};

export { RowReplies };
