import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { toReadout } from "./image-adjust-model.js";
import type { AdjustField } from "./image-adjust-model.js";
import type { ImageAdjust } from "./use-image-adjust.js";

interface SliderProps {
  readonly adjust: ImageAdjust;
  readonly field: AdjustField;
  readonly isDisabled: boolean;
}

const AdjustSlider = ({
  adjust,
  field,
  isDisabled,
}: SliderProps): ReactElement => {
  const { handleChange, handleRelease } = adjust;
  const value = adjust.values[field.key];
  const id = `img-adjust-${field.key}`;

  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      handleChange(field, Number(event.currentTarget.value));
    },
    [handleChange, field]
  );

  return (
    <div className="img-adjust-line">
      <label htmlFor={id}>{field.label}</label>
      <input
        id={id}
        type="range"
        className="img-adjust-range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        disabled={isDisabled}
        aria-valuetext={toReadout(field, value)}
        onChange={change}
        onPointerUp={handleRelease}
        onKeyUp={handleRelease}
        onBlur={handleRelease}
      />
      <output htmlFor={id} className="img-adjust-value">
        {toReadout(field, value)}
      </output>
    </div>
  );
};

export { AdjustSlider };
