import type { ReactElement } from "react";

import { hasErrorCard } from "./chat-parts-model.js";
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
  const hasCard = hasErrorCard(run);
  const isFailed = hasCard && run.status === "failed";
  const { summary } = run;

  return (
    <div className="run-foot" data-status={run.status}>
      {!done && !isFailed && <RunStatusBadge status={run.status} />}
      {summary && <RunFootMeta summary={summary} />}
      {!hasCard && (
        <RunFootActions
          hasChanges={hasChanges}
          onReview={onReview}
          onDetails={onDetails}
        />
      )}
      {done && <RunThumbs thumb={thumb} onChange={onThumb} />}
      {run.status !== "running" && !isFailed && readReply() && (
        <ReplyCopy getText={readReply} />
      )}
    </div>
  );
};

export { RunFootRow };
