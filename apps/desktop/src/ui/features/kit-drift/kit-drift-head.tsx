import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface KitDriftHeadProps {
  readonly count: number;
  readonly hasHigh: boolean;
  readonly isBusy: boolean;
  readonly onSwapAll: () => void;
}

const KitDriftHead = ({
  count,
  hasHigh,
  isBusy,
  onSwapAll,
}: KitDriftHeadProps): ReactElement => (
  <div className="review-group-head">
    <span className="review-group-name">{copy.title}</span>
    <span className="review-count num">{count}</span>
    <div className="spacer" />
    {hasHigh && (
      <button
        className="btn small"
        data-tip={copy.swapAllTip}
        data-tip-align="end"
        disabled={isBusy}
        onClick={onSwapAll}
        type="button"
      >
        {isBusy && <span className="spinner" />}
        <span>{copy.swapAll}</span>
      </button>
    )}
  </div>
);

export { KitDriftHead };
