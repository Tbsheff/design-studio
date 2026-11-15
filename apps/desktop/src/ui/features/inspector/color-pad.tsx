import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { PERCENT, toHueColor, toOpaqueColor } from "./color-popup-model.js";
import { copy } from "./copy.js";
import type { ColorPadControl } from "./use-color-controls.js";
import type { ColorPopupState } from "./use-color-popup.js";

import styles from "./color-popup.module.css";

const ColorPad = ({
  popup,
  control,
}: {
  readonly popup: ColorPopupState;
  readonly control: ColorPadControl;
}): ReactElement => {
  const { hsva, pad } = popup;
  const { drag } = control;

  const padStyle = useMemo(
    (): CSSProperties => ({ ["--pad-hue" as string]: toHueColor(hsva.hue) }),
    [hsva.hue]
  );

  const thumbStyle = useMemo(
    (): CSSProperties => ({
      background: toOpaqueColor(hsva),
      left: `${hsva.saturation * PERCENT}%`,
      top: `${(1 - hsva.value) * PERCENT}%`,
    }),
    [hsva]
  );

  const label = `${copy.colorPad} ${Math.round(hsva.saturation * PERCENT)}% ${Math.round(hsva.value * PERCENT)}%`;

  return (
    <button
      ref={pad}
      type="button"
      className={styles.pad}
      style={padStyle}
      aria-label={label}
      onKeyDown={control.handleKeyDown}
      onPointerDown={drag.handlePointerDown}
      onPointerMove={drag.handlePointerMove}
      onPointerUp={drag.handlePointerUp}
    >
      <span className={styles.padThumb} style={thumbStyle} />
    </button>
  );
};

export { ColorPad };
