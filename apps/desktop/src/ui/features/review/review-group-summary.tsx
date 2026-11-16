import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

interface ReviewGroupSummaryProps {
  readonly count: number;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}

const ReviewGroupSummary = ({
  count,
  isOpen,
  onToggle,
}: ReviewGroupSummaryProps): ReactElement => (
  <li className="review-row">
    <p className="review-msg">{`${count}${copy.tapGroupText}`}</p>
    <div className="review-actions">
      <button
        type="button"
        className="btn ghost small"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        {pick(isOpen, copy.tapGroupHide, copy.tapGroupShow)}
      </button>
    </div>
  </li>
);

export { ReviewGroupSummary };
