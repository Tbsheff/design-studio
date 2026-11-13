import type { ReactElement } from "react";

import { copy } from "./copy.js";

const RunFootActions = ({
  hasChanges,
  onReview,
  onDetails,
}: {
  hasChanges: boolean;
  onReview: (() => void) | null;
  onDetails: () => void;
}): ReactElement => (
  <span className="run-foot-actions">
    {onReview && hasChanges && (
      <button
        type="button"
        className="btn ghost small run-foot-details"
        data-tip={copy.keepOrUndo}
        data-tip-side="top"
        onClick={onReview}
      >
        {copy.review}
      </button>
    )}
    <button
      type="button"
      className="btn ghost small run-foot-details"
      onClick={onDetails}
    >
      {copy.details}
    </button>
  </span>
);

export { RunFootActions };
