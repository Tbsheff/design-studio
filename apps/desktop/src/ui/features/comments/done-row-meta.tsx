import type { ReactElement } from "react";

import type { DesignComment } from "./deps.js";
import { RunLink } from "./run-link.js";
import { TargetLink } from "./target-link.js";
import type { CommentsControl } from "./use-comments.js";
import { VersionLink } from "./version-link.js";

const DoneRowMeta = ({
  comment,
  control,
  onOpenRun,
  onOpenVersion,
}: {
  comment: DesignComment;
  control: CommentsControl;
  onOpenRun: (runId: string) => void;
  onOpenVersion: (versionId: string) => void;
}): ReactElement => {
  const { runId, versionId } = comment;

  return (
    <span className="comment-row-meta">
      {comment.status === "draft" && (
        <TargetLink comment={comment} control={control} />
      )}
      {runId && (
        <RunLink onOpenRun={onOpenRun} runId={runId} status={comment.status} />
      )}
      {versionId && (
        <VersionLink onOpenVersion={onOpenVersion} versionId={versionId} />
      )}
    </span>
  );
};

export { DoneRowMeta };
