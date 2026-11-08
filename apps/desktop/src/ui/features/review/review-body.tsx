import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import { ReviewGroup } from "./review-group.js";
import { toGroups } from "./review-model.js";
import type { ReviewActions } from "./review-model.js";
import type { ReviewState } from "./use-review.js";

interface ReviewBodyProps {
  readonly review: ReviewState;
  readonly isLive: boolean;
  readonly actions: ReviewActions;
  readonly children: ReactNode;
}

const ReviewBody = ({
  actions,
  children,
  isLive,
  review,
}: ReviewBodyProps): ReactElement => {
  const { result } = review;

  return (
    <div className="review-body">
      {!isLive && <div className="alert">{copy.reviewChecksTheLive}</div>}
      {review.error && <div className="alert error">{review.error}</div>}
      {review.busy && !result && (
        <div className="review-wait">
          <span className="spinner" />
          {copy.checkingTheFrame}
        </div>
      )}
      {result && result.findings.length === 0 && (
        <div className="review-wait">{copy.thisFramePassesEvery}</div>
      )}
      {result &&
        toGroups(result.findings).map(([kind, list]) => (
          <ReviewGroup key={kind} kind={kind} list={list} actions={actions} />
        ))}
      {children}
    </div>
  );
};

export { ReviewBody };
