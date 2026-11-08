import type { ReactElement } from "react";
import { useCallback, useState } from "react";

import { CommentAuthor } from "./comment-author.js";
import type { DesignComment } from "./deps.js";
import { PickNum } from "./pick-num.js";
import { QueuedRowFoot } from "./queued-row-foot.js";
import { QueuedText } from "./queued-text.js";
import { RowReplies } from "./row-replies.js";
import type { CommentsControl } from "./use-comments.js";

const toRowClass = (isOpen: boolean): string => {
  if (isOpen) {
    return "comment-row open";
  }

  return "comment-row ";
};

const QueuedRow = ({
  comment,
  control,
  index,
  total,
}: {
  comment: DesignComment;
  control: CommentsControl;
  index: number;
  total: number;
}): ReactElement => {
  const [isEditing, setIsEditing] = useState(false);

  const startEdit = useCallback((): void => {
    setIsEditing(true);
  }, []);

  const stopEdit = useCallback((): void => {
    setIsEditing(false);
  }, []);

  return (
    <li
      className={toRowClass(control.openId === comment.id)}
      data-testid="comment-row"
      data-status="queued"
    >
      <PickNum comment={comment} control={control} />
      <div className="comment-row-body">
        <CommentAuthor
          author={comment.author}
          viewer={comment.from === "viewer"}
        />
        <QueuedText
          comment={comment}
          control={control}
          isEditing={isEditing}
          onStop={stopEdit}
        />
        <RowReplies comment={comment} control={control} />
        <QueuedRowFoot
          comment={comment}
          control={control}
          index={index}
          onEdit={startEdit}
          total={total}
        />
      </div>
    </li>
  );
};

export { QueuedRow };
