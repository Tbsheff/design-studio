import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { keepFocus } from "./text-range-model.js";
import type { TextRangeColor } from "./use-text-range-colors.js";

import styles from "./text-range.module.css";

interface TextRangeSwatchProps {
  readonly color: TextRangeColor;
  readonly onPick: (className: string) => void;
}

const TextRangeSwatch = ({
  color,
  onPick,
}: TextRangeSwatchProps): ReactElement => {
  const handlePick = useCallback(
    (): void => onPick(color.className),
    [color.className, onPick]
  );

  const paint = useMemo(() => ({ background: color.value }), [color.value]);

  return (
    <button
      aria-label={color.className}
      className={styles.swatch}
      data-tip={color.className}
      onClick={handlePick}
      onMouseDown={keepFocus}
      style={paint}
      type="button"
    />
  );
};

export { TextRangeSwatch };
