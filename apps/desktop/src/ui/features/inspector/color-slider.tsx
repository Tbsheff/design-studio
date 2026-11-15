import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import type { ColorRange } from "./use-color-controls.js";

import styles from "./color-popup.module.css";

interface ColorSliderProps {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly track: string;
  readonly thumb: string;
  readonly control: ColorRange;
}

const ColorSlider = ({
  label,
  value,
  max,
  track,
  thumb,
  control,
}: ColorSliderProps): ReactElement => {
  const sliderStyle = useMemo(
    (): CSSProperties => ({
      ["--slider-thumb" as string]: thumb,
      ["--slider-track" as string]: track,
    }),
    [thumb, track]
  );

  return (
    <input
      type="range"
      className={styles.slider}
      style={sliderStyle}
      aria-label={label}
      min={0}
      max={max}
      step={1}
      value={Math.round(value)}
      onChange={control.handleChange}
      onKeyDown={control.handleKeyDown}
      onPointerDown={control.handlePointerDown}
      onPointerUp={control.handlePointerUp}
    />
  );
};

export { ColorSlider };
