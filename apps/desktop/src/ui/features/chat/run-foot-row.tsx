import type { ReactElement } from "react";

import { ReplyCopy } from "./reply-copy.js";
import type { RunFeedback, Thumb } from "./run-feedback-model.js";
import { RunFootActions } from "./run-foot-actions.js";
import { RunFootMeta } from "./run-foot-meta.js";
import type { RunView } from "./run-state-model.js";
import { RunStatusBadge } from "./run-status-badge.js";
import { RunThumbs } from "./run-thumbs.js";

interface RunFootRowProps {
  readonly run: RunView;
  readonly thumb: Thumb | null;
  readonly hasChanges: boolean;
  readonly readReply: () => string;
  readonly onThumb: (patch: Partial<RunFeedback>) => void;
  readonly onReview: (() => void) | null;
  readonly onDetails: () => void;
}

const RunFootRow = ({
  run,
  thumb,
  hasChanges,
  readReply,
  onThumb,
  onReview,
  onDetails,
}: RunFootRowProps): ReactElement => {
  const done = run.status === "completed";
  const { summary } = run;

  return (
    <div className="run-foot" data-status={run.status}>
      {done && <RunThumbs thumb={thumb} onChange={onThumb} />}
      {!done && <RunStatusBadge status={run.status} />}
      {run.status !== "running" && readReply() && (
        <ReplyCopy getText={readReply} />
      )}
      {summary && <RunFootMeta summary={summary} />}
      <RunFootActions
        hasChanges={hasChanges}
        onReview={onReview}
        onDetails={onDetails}
      />
    </div>
  );
};

export { RunFootRow };
