import type { ReactElement } from "react";

import { CommentAction } from "./comment-action.js";
import type { DesignComment } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

const DoneRowActions = ({
  comment,
  control,
}: {
  comment: DesignComment;
  control: CommentsControl;
}): ReactElement => (
  <div className="comment-row-actions">
    <CommentAction
      kind="fix"
      comment={comment}
      control={control}
      index={0}
      total={1}
      onPress={null}
    />
    {comment.status === "draft" && (
      <CommentAction
        kind="resolveText"
        comment={comment}
        control={control}
        index={0}
        total={1}
        onPress={null}
      />
    )}
    {comment.status === "resolved" && (
      <CommentAction
        kind="reopen"
        comment={comment}
        control={control}
        index={0}
        total={1}
        onPress={null}
      />
    )}
    <CommentAction
      kind="delete"
      comment={comment}
      control={control}
      index={0}
      total={1}
      onPress={null}
    />
  </div>
);

export { DoneRowActions };
