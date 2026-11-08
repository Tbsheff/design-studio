import type { ReactElement } from "react";

import type { DesignComment } from "./deps.js";
import { DoneRowActions } from "./done-row-actions.js";
import { DoneRowMeta } from "./done-row-meta.js";
import type { CommentsControl } from "./use-comments.js";

const DoneRowFoot = ({
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
  <div className="comment-row-foot">
    <DoneRowMeta
      comment={comment}
      control={control}
      onOpenRun={onOpenRun}
      onOpenVersion={onOpenVersion}
    />
    <DoneRowActions comment={comment} control={control} />
  </div>
);

export { DoneRowFoot };
