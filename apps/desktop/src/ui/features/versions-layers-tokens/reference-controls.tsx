import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { COPY } from "./copy.js";
import { PicturePicker } from "./picture-picker.js";
import type { Picture } from "./use-picture.js";

const OPACITY_MIN = 10;
const OPACITY_MAX = 100;
const OPACITY_STEP = 5;

interface ReferenceControlsProps {
  readonly onOpacity: (value: number) => void;
  readonly onPick: (file: File | null) => void;
  readonly opacity: number;
  readonly picture: Picture | null;
}

const ReferenceControls = ({
  onOpacity,
  onPick,
  opacity,
  picture,
}: ReferenceControlsProps): ReactNode => {
  const handleOpacityChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onOpacity(Number(event.target.value));
    },
    [onOpacity]
  );

  if (!picture) {
    return <div className="compare-ref-controls" />;
  }

  return (
    <div className="compare-ref-controls">
      <span className="compare-ref-name" data-tip={picture.name}>
        <span className="truncate">{`${COPY.pictureReference}${picture.name}`}</span>
      </span>
      <input
        type="range"
        className="compare-opacity"
        aria-label={COPY.labelReferenceOpacity}
        min={OPACITY_MIN}
        max={OPACITY_MAX}
        step={OPACITY_STEP}
        value={opacity}
        onChange={handleOpacityChange}
      />
      <span className="compare-opacity-value">{`${opacity}%`}</span>
      <PicturePicker isCompact onPick={onPick} size={null} />
    </div>
  );
};

export { ReferenceControls };
