import type { ReactElement } from "react";

import { RunFeedbackRow } from "./chat-feedback.js";
import { PlanCard } from "./plan-card.js";
import { RunCommentsCard } from "./run-comments.js";
import type { RunBodyTailProps } from "./run-entry-model.js";
import type { RunView } from "./run-state-model.js";

const hasComments = (run: RunView): boolean => {
  const lists = [
    run.request?.comments,
    run.request?.commentIds,
    run.summary?.request?.comments,
    run.summary?.request?.commentIds,
  ];

  return lists.some((list) => (list?.length ?? 0) > 0);
};

const RunBodyTail = ({
  run,
  latest,
  onDetails,
  onReview,
  onApprovePlan,
}: RunBodyTailProps): ReactElement => {
  const isPlanShown = latest && run.status === "completed" && run.request?.plan;

  return (
    <>
      {hasComments(run) && <RunCommentsCard run={run} />}
      <RunFeedbackRow run={run} onDetails={onDetails} onReview={onReview} />
      {isPlanShown && onApprovePlan && <PlanCard onApprove={onApprovePlan} />}
    </>
  );
};

export { RunBodyTail };
