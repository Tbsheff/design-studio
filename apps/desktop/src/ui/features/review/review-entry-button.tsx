import type { ReviewResult } from "@design-studio/contracts/review";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import { ReviewEntryBadge } from "./review-entry-badge.js";

interface Props {
  count: number | null;
  isBusy: boolean;
  isDisabled: boolean;
  isOpen: boolean;
  isStale: boolean;
  result: ReviewResult | null;
  onToggle: () => void;
}

const ICON_SIZE = 14;

const toEntryTip = (
  isOpen: boolean,
  count: number | null,
  isStale: boolean
): string | null => {
  if (isOpen) {
    return null;
  }

  if (count === null) {
    return "Check contrast, tap targets, alt text, tokens and clipping";
  }

  return `${count} review ${pick(count === 1, "finding", "findings")}${pick(isStale, " (from an older render)", "")}`;
};

const ReviewEntryButton = ({
  count,
  isBusy,
  isDisabled,
  isOpen,
  isStale,
  onToggle,
  result,
}: Props): ReactElement => (
  <button
    type="button"
    className="btn ghost topbar-review review-entry"
    aria-label={pick(count === null, "Review", `Review, ${count} findings`)}
    aria-pressed={isOpen}
    aria-expanded={isOpen}
    disabled={isDisabled}
    data-tip={toEntryTip(isOpen, count, isStale)}
    data-tip-align="end"
    onClick={onToggle}
  >
    {pick(
      isBusy && !isOpen,
      <span className="spinner" />,
      <Icon name="review" size={ICON_SIZE} />
    )}
    <span>{copy.review}</span>
    <ReviewEntryBadge count={count} isStale={isStale} result={result} />
  </button>
);

export { ReviewEntryButton };
