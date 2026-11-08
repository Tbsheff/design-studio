import type { ReactElement } from "react";

import type { DesignComment } from "./deps.js";
import { QueuedRowActions } from "./queued-row-actions.js";
import { TargetLink } from "./target-link.js";
import type { CommentsControl } from "./use-comments.js";

const QueuedRowFoot = ({
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
  <div className="comment-row-foot">
    <span className="comment-row-meta">
      <TargetLink comment={comment} control={control} />
    </span>
    <QueuedRowActions
      comment={comment}
      control={control}
      index={index}
      onEdit={onEdit}
      total={total}
    />
  </div>
);

export { QueuedRowFoot };
