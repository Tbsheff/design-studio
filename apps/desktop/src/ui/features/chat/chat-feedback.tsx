import { CopyButton } from "@design-studio/ui";
import { memo, useCallback, useMemo } from "react";

import { FileChips } from "./file-chips.js";
import { useRunFeedback } from "./run-feedback-model.js";
import { RunFootActions } from "./run-foot-actions.js";
import { RunFootMeta } from "./run-foot-meta.js";
import type { RunView } from "./run-state-model.js";
import { runText } from "./run-state-model.js";
import { RunStatusBadge } from "./run-status-badge.js";
import { RunThumbs } from "./run-thumbs.js";
import { StopNote } from "./stop-note.js";
import { fileChanges } from "./tool-rows-model.js";

const RunFeedbackRow = memo(
  ({
    run,
    onDetails,
    onReview,
  }: {
    run: RunView;
    onDetails: () => void;
    onReview?: (() => void) | undefined;
  }) => {
    const [feedback, setFeedback] = useRunFeedback(run.runId);

    const changes = useMemo(() => {
      if (run.status === "running") {
        return [];
      }

      return fileChanges(run.tools);
    }, [run.status, run.tools]);

    const readReply = useCallback(() => runText(run), [run]);
    const { summary } = run;
    const done = run.status === "completed";
    const hasReview = Boolean(onReview);

    return (
      <div className="run-feedback">
        <FileChips
          changes={changes}
          isQuiet={
            run.status !== "running" &&
            run.tools.length > 0 &&
            !run.request?.plan
          }
          hasReview={hasReview}
          onOpen={onReview ?? onDetails}
        />
        <StopNote run={run} />
        <div className="run-foot" data-status={run.status}>
          {done && <RunThumbs thumb={feedback.thumb} onChange={setFeedback} />}
          {!done && <RunStatusBadge status={run.status} />}
          {run.status !== "running" && runText(run) && (
            <CopyButton
              getText={readReply}
              label="Copy reply"
              className="reply-copy"
            />
          )}
          {summary && <RunFootMeta summary={summary} />}
          <RunFootActions
            hasChanges={changes.length > 0}
            onReview={onReview ?? null}
            onDetails={onDetails}
          />
        </div>
      </div>
    );
  }
);

RunFeedbackRow.displayName = "RunFeedbackRow";

export { RunFeedbackRow };
