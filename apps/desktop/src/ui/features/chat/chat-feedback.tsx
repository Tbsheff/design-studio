import { memo, useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { FileChips } from "./file-chips.js";
import { useRunFeedback } from "./run-feedback-model.js";
import { RunFootRow } from "./run-foot-row.js";
import type { RunView } from "./run-state-model.js";
import { runText } from "./run-state-model.js";
import { StopNote } from "./stop-note.js";
import { fileChanges } from "./tool-rows-model.js";

const RunFeedbackRowBody = ({
  run,
  onDetails,
  onReview,
}: {
  run: RunView;
  onDetails: () => void;
  onReview?: (() => void) | undefined;
}): ReactElement => {
  const [feedback, setFeedback] = useRunFeedback(run.runId);

  const changes = useMemo(() => {
    if (run.status === "running") {
      return [];
    }

    return fileChanges(run.tools);
  }, [run.status, run.tools]);

  const readReply = useCallback(() => runText(run), [run]);
  const hasReview = Boolean(onReview);

  return (
    <div className="run-feedback">
      <FileChips
        changes={changes}
        isQuiet={
          run.status !== "running" && run.tools.length > 0 && !run.request?.plan
        }
        hasReview={hasReview}
        onOpen={onReview ?? onDetails}
      />
      <StopNote run={run} />
      <RunFootRow
        run={run}
        thumb={feedback.thumb}
        hasChanges={changes.length > 0}
        readReply={readReply}
        onThumb={setFeedback}
        onReview={onReview ?? null}
        onDetails={onDetails}
      />
    </div>
  );
};

const RunFeedbackRow = memo(RunFeedbackRowBody);

RunFeedbackRow.displayName = "RunFeedbackRow";

export { RunFeedbackRow };
