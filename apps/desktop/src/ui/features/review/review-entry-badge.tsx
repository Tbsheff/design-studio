import type {
  ReviewResult,
  ReviewSeverity,
} from "@design-studio/contracts/review";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";

interface Props {
  count: number | null;
  isStale: boolean;
  result: ReviewResult | null;
}

const MAX_BADGE = 99;
const SEVERITIES = ["high", "medium", "low"] as const;

const toBadgeText = (count: number): string => {
  if (count > MAX_BADGE) {
    return "99+";
  }

  return String(count);
};

const toWorst = (result: ReviewResult | null): ReviewSeverity | null => {
  if (!result) {
    return null;
  }

  return SEVERITIES.find((severity) => result.counts[severity] > 0) ?? null;
};

const ReviewEntryBadge = ({
  count,
  isStale,
  result,
}: Props): ReactElement | null => {
  if (count === null || count <= 0) {
    return null;
  }

  const tone = pick(isStale, "stale", toWorst(result) ?? "low");

  return <span className={`review-badge ${tone}`}>{toBadgeText(count)}</span>;
};

export { ReviewEntryBadge };
