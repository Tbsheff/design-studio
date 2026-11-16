import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import type { ReviewState } from "./use-review.js";

interface ReviewSummaryProps {
  readonly review: ReviewState;
  readonly spellingCount: number;
}

const SEVERITIES = ["high", "medium", "low"] as const;

const ReviewSummary = ({
  review,
  spellingCount,
}: ReviewSummaryProps): ReactElement | null => {
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

  if (spellingCount > 0) {
    parts.push(`${spellingCount} ${copy.spellingSummary}`);
  }

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
