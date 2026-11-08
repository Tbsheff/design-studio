import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { pick } from "./pick.js";
import type { ReviewState } from "./use-review.js";

interface ReviewSummaryProps {
  readonly review: ReviewState;
}

const SEVERITIES = ["high", "medium", "low"] as const;

const ReviewSummary = ({ review }: ReviewSummaryProps): ReactElement | null => {
  const { result } = review;

  if (!result) {
    return null;
  }

  const parts = SEVERITIES.flatMap((sev) => {
    if (result.counts[sev] > 0) {
      return [`${result.counts[sev]} ${sev}`];
    }

    return [];
  });

  return (
    <div className="review-summary">
      <span>{pick(parts.length > 0, parts.join(" · "), copy.noFindings)}</span>
      {review.stale && <span className="badge warn">{copy.outOfDate}</span>}
      {result.notes.map((note) => (
        <span key={note} className="muted">
          {note}
        </span>
      ))}
    </div>
  );
};

export { ReviewSummary };
