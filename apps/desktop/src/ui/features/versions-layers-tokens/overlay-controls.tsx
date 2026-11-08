import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { COPY } from "./copy.js";
import { OverlayStatus } from "./overlay-status.js";
import type { MaskState } from "./use-diff-mask.js";

const OPACITY_MIN = 10;
const OPACITY_MAX = 100;
const OPACITY_STEP = 5;

interface OverlayControlsProps {
  readonly isShown: boolean;
  readonly onOpacity: (value: number) => void;
  readonly onRetry: () => void;
  readonly onShown: (value: boolean) => void;
  readonly opacity: number;
  readonly state: MaskState;
}

const OverlayControls = (props: OverlayControlsProps): ReactNode => {
  const { onOpacity, onShown } = props;

  const handleShownChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onShown(event.target.checked);
    },
    [onShown]
  );

  const handleOpacityChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onOpacity(Number(event.target.value));
    },
    [onOpacity]
  );

  return (
    <div className="compare-overlay-controls">
      <OverlayStatus state={props.state} onRetry={props.onRetry} />
      <label className="compare-toggle">
        <input
          type="checkbox"
          checked={props.isShown}
          onChange={handleShownChange}
        />
        {COPY.overlayShowChanges}
      </label>
      <input
        type="range"
        className="compare-opacity"
        aria-label={COPY.labelChangeTintOpacity}
        min={OPACITY_MIN}
        max={OPACITY_MAX}
        step={OPACITY_STEP}
        value={props.opacity}
        disabled={!props.isShown}
        onChange={handleOpacityChange}
      />
      <span className="compare-opacity-value">{`${props.opacity}%`}</span>
    </div>
  );
};

export { OverlayControls };
