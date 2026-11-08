import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";

const PLUS_SIZE = 14;

interface DirectionsHeadProps {
  readonly count: number;
  readonly isDisabled: boolean;
  readonly onNew: () => void;
}

const DirectionsHead = ({
  count,
  isDisabled,
  onNew,
}: DirectionsHeadProps): ReactNode => (
  <div className="section-head">
    <h3 id="directions-heading">
      {COPY.directionsTitle} <span className="count">{count}</span>
    </h3>
    <button
      type="button"
      className="btn ghost small has-icon"
      disabled={isDisabled}
      onClick={onNew}
    >
      <Icon name="plus" size={PLUS_SIZE} />
      {COPY.directionNew}
    </button>
  </div>
);

export { DirectionsHead };
