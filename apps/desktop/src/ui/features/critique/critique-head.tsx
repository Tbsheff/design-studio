import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toRunLabel } from "./critique-model.js";
import { Icon } from "./deps.js";

interface HeadProps {
  readonly count: number | null;
  readonly isBusy: boolean;
  readonly isDisabled: boolean;
  readonly onRun: () => void;
}

const ICON_SIZE = 12;

const CritiqueHead = ({
  count,
  isBusy,
  isDisabled,
  onRun,
}: HeadProps): ReactElement => (
  <div className="review-group-head">
    <span className="review-group-name">{copy.title}</span>
    {count !== null && <span className="review-count num">{count}</span>}
    <div className="spacer" />
    <button
      className="btn small"
      data-tip={copy.runTip}
      data-tip-align="end"
      disabled={isBusy || isDisabled}
      onClick={onRun}
      type="button"
    >
      {isBusy && <span className="spinner" />}
      {!isBusy && <Icon name="review" size={ICON_SIZE} />}
      <span>{toRunLabel(isBusy, count !== null)}</span>
    </button>
  </div>
);

export { CritiqueHead };
