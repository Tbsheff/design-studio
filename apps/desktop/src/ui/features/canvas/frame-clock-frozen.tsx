import type { ReactElement } from "react";

import { clockCopy } from "./frame-clock-copy.js";

const FrameClockFrozen = ({
  isDisabled,
  isFrozen,
  onToggle,
}: {
  isDisabled: boolean;
  isFrozen: boolean;
  onToggle: () => void;
}): ReactElement => (
  <label className="frame-clock-frozen" data-tip={clockCopy.frozenTip}>
    <input
      type="checkbox"
      checked={isFrozen}
      disabled={isDisabled}
      onChange={onToggle}
    />
    <span>{clockCopy.frozen}</span>
  </label>
);

export { FrameClockFrozen };
