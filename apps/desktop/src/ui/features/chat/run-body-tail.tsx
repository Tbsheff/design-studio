import type { ReactElement } from "react";

import { canPolishRun } from "../../chat-slots.js";
import { RunFeedbackRow } from "./chat-feedback.js";
import { PlanCard } from "./plan-card.js";
import { PolishThis } from "./polish-this.js";
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
  headVersionId,
  isPolishDisabled,
  onDetails,
  onReview,
  onPolish,
  onApprovePlan,
}: RunBodyTailProps): ReactElement => {
  const isPlanShown = latest && run.status === "completed" && run.request?.plan;

  return (
    <>
      {hasComments(run) && <RunCommentsCard run={run} />}
      <RunFeedbackRow run={run} onDetails={onDetails} onReview={onReview} />
      {isPlanShown && onApprovePlan && <PlanCard onApprove={onApprovePlan} />}
      {canPolishRun(run, headVersionId) && (
        <PolishThis disabled={isPolishDisabled} onPolish={onPolish} />
      )}
    </>
  );
};

export { RunBodyTail };
