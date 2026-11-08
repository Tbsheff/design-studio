import type { ReactElement } from "react";

import { CommentAuthor } from "./comment-author.js";
import type { DesignComment } from "./deps.js";
import { DoneRowFoot } from "./done-row-foot.js";
import { PickNum } from "./pick-num.js";
import { RowReplies } from "./row-replies.js";
import type { CommentsControl } from "./use-comments.js";

const DoneRow = ({
  comment,
  control,
  onOpenRun,
  onOpenVersion,
}: {
  comment: DesignComment;
  control: CommentsControl;
  onOpenRun: (runId: string) => void;
  onOpenVersion: (versionId: string) => void;
}): ReactElement => (
  <li
    className="comment-row"
    data-testid="comment-row"
    data-status={comment.status}
  >
    <PickNum comment={comment} control={control} />
    <div className="comment-row-body">
      <CommentAuthor
        author={comment.author}
        viewer={comment.from === "viewer"}
      />
      <span className="comment-row-text">{comment.text}</span>
      <RowReplies comment={comment} control={control} />
      <DoneRowFoot
        comment={comment}
        control={control}
        onOpenRun={onOpenRun}
        onOpenVersion={onOpenVersion}
      />
    </div>
  </li>
);

export { DoneRow };
