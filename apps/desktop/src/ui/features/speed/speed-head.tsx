import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface SpeedHeadProps {
  readonly canCompare: boolean;
  readonly isBusy: boolean;
  readonly isLive: boolean;
  readonly onBaseline: () => void;
  readonly onCompare: () => void;
}

const SpeedHead = ({
  canCompare,
  isBusy,
  isLive,
  onBaseline,
  onCompare,
}: SpeedHeadProps): ReactElement => {
  let compareTip: string = copy.compareTip;

  if (!canCompare) {
    compareTip = copy.compareNeedsBaseline;
  }

  return (
    <div className="review-group-head">
      <span className="review-group-name">{copy.title}</span>
      <div className="spacer" />
      <button
        className="btn small"
        data-tip={copy.baselineTip}
        data-tip-align="end"
        disabled={isBusy || !isLive}
        onClick={onBaseline}
        type="button"
      >
        <span>{copy.baseline}</span>
      </button>
      <button
        className="btn small"
        data-tip={compareTip}
        data-tip-align="end"
        disabled={isBusy || !isLive || !canCompare}
        onClick={onCompare}
        type="button"
      >
        {isBusy && <span className="spinner" />}
        <span>{copy.compare}</span>
      </button>
    </div>
  );
};

export { SpeedHead };
