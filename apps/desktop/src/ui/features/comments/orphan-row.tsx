import type { ReactElement } from "react";

import type { DesignComment } from "./deps.js";
import { OrphanRowFoot } from "./orphan-row-foot.js";
import { PickNum } from "./pick-num.js";
import { RowReplies } from "./row-replies.js";
import type { CommentsControl } from "./use-comments.js";

const OrphanRow = ({
  comment,
  control,
}: {
  comment: DesignComment;
  control: CommentsControl;
}): ReactElement => (
  <li className="comment-row" data-testid="comment-row" data-status="orphaned">
    <PickNum comment={comment} control={control} />
    <div className="comment-row-body">
      <span className="comment-row-text">{comment.text}</span>
      <RowReplies comment={comment} control={control} />
      <OrphanRowFoot comment={comment} control={control} />
    </div>
  </li>
);

export { OrphanRow };
