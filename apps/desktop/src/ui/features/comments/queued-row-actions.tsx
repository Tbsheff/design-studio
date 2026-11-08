import type { ReactElement } from "react";

import { CommentAction } from "./comment-action.js";
import type { DesignComment } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

const QueuedRowActions = ({
  comment,
  control,
  index,
  onEdit,
  total,
}: {
  comment: DesignComment;
  control: CommentsControl;
  index: number;
  onEdit: () => void;
  total: number;
}): ReactElement => (
  <div className="comment-row-actions">
    <CommentAction
      kind="up"
      comment={comment}
      control={control}
      index={index}
      total={total}
      onPress={null}
    />
    <CommentAction
      kind="down"
      comment={comment}
      control={control}
      index={index}
      total={total}
      onPress={null}
    />
    <CommentAction
      kind="fix"
      comment={comment}
      control={control}
      index={index}
      total={total}
      onPress={null}
    />
    <CommentAction
      kind="edit"
      comment={comment}
      control={control}
      index={index}
      total={total}
      onPress={onEdit}
    />
    <CommentAction
      kind="resolve"
      comment={comment}
      control={control}
      index={index}
      total={total}
      onPress={null}
    />
    <CommentAction
      kind="delete"
      comment={comment}
      control={control}
      index={index}
      total={total}
      onPress={null}
    />
    <CommentAction
      kind="sendNow"
      comment={comment}
      control={control}
      index={index}
      total={total}
      onPress={null}
    />
  </div>
);

export { QueuedRowActions };
