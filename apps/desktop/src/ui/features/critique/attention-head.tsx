import type { ReactElement } from "react";

import { toAttentionRunLabel } from "./attention-model.js";
import { copy } from "./copy.js";
import { Icon } from "./deps.js";

interface HeadProps {
  readonly hasResult: boolean;
  readonly isBusy: boolean;
  readonly isDisabled: boolean;
  readonly onRun: () => void;
}

const ICON_SIZE = 12;

const AttentionHead = ({
  hasResult,
  isBusy,
  isDisabled,
  onRun,
}: HeadProps): ReactElement => (
  <div className="review-group-head">
    <span className="review-group-name">{copy.attention.title}</span>
    <div className="spacer" />
    <button
      className="btn small"
      data-tip={copy.attention.runTip}
      data-tip-align="end"
      disabled={isBusy || isDisabled}
      onClick={onRun}
      type="button"
    >
      {isBusy && <span className="spinner" />}
      {!isBusy && <Icon name="review" size={ICON_SIZE} />}
      <span>{toAttentionRunLabel(isBusy, hasResult)}</span>
    </button>
  </div>
);

export { AttentionHead };
