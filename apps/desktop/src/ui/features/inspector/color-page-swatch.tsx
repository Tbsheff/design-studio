import { useCallback, useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { toHexText, toHsvaOf, toPageValue } from "./color-popup-model.js";
import type { PageColor } from "./color-popup-model.js";
import { toSwatchColor } from "./css-value-model.js";

import styles from "./color-popup.module.css";

const toTip = (color: PageColor): string => {
  const hex = toHexText(toHsvaOf(color.value));

  if (color.token) {
    return `${color.token} ${hex}`;
  }

  return hex;
};

const ColorPageSwatch = ({
  color,
  onPick,
}: {
  readonly color: PageColor;
  readonly onPick: (value: string) => void;
}): ReactElement => {
  const swatchStyle = useMemo(
    (): CSSProperties => ({
      ["--swatch" as string]: toSwatchColor(color.value),
    }),
    [color.value]
  );

  const applyColor = useCallback(
    (): void => onPick(toPageValue(color)),
    [onPick, color]
  );

  const tip = toTip(color);

  return (
    <li>
      <button
        type="button"
        className={styles.pageSwatch}
        style={swatchStyle}
        aria-label={tip}
        data-tip={tip}
        onClick={applyColor}
      />
    </li>
  );
};

export { ColorPageSwatch };
