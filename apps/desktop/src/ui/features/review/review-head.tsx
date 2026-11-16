import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

interface ReviewHeadProps {
  readonly frameLabel: string;
  readonly isBusy: boolean;
  readonly isLive: boolean;
  readonly onRun: () => void;
  readonly onClose: () => void;
}

const ReviewHead = ({
  frameLabel,
  isBusy,
  isLive,
  onClose,
  onRun,
}: ReviewHeadProps): ReactElement => (
  <div className="review-head">
    <Icon name="check" />
    <strong>{copy.review}</strong>
    <span className="muted truncate">{frameLabel}</span>
    <div className="spacer" />
    <button
      type="button"
      className="icon-btn"
      aria-label={copy.runTheReview}
      data-tip={copy.runAgain}
      disabled={isBusy || !isLive}
      onClick={onRun}
    >
      {pick(
        isBusy,
        <span className="spinner" />,
        <Icon name="reload" size={14} />
      )}
    </button>
    <button
      type="button"
      className="icon-btn"
      aria-label={copy.close}
      data-tip={copy.close}
      data-tip-align="end"
      onClick={onClose}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { ReviewHead };
