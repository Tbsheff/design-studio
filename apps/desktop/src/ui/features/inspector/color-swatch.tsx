import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { ColorPopup } from "./color-popup.js";
import { copy } from "./copy.js";
import { isSwatchEmpty, toSwatchColor } from "./css-value-model.js";
import { toModifiedClass } from "./field-model.js";
import { useColorPopup } from "./use-color-popup.js";
import type { ColorTarget } from "./use-color-popup.js";

import styles from "./color-popup.module.css";

const ColorSwatch = ({
  label,
  shown,
  isDisabled,
  target,
}: {
  readonly label: string;
  readonly shown: string;
  readonly isDisabled: boolean;
  readonly target: ColorTarget;
}): ReactElement => {
  const popup = useColorPopup(target);
  const { trigger, isOpen, handleToggle } = popup;

  const swatchStyle = useMemo(
    (): CSSProperties => ({ ["--swatch" as string]: toSwatchColor(shown) }),
    [shown]
  );

  return (
    <span
      ref={trigger}
      className={toModifiedClass("ins-swatch", "empty", isSwatchEmpty(shown))}
      style={swatchStyle}
    >
      <button
        type="button"
        className={styles.swatchButton}
        aria-label={`${label}${copy.swatchSuffix}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={isDisabled}
        onClick={handleToggle}
      />
      {isOpen && <ColorPopup header={null} popup={popup} />}
    </span>
  );
};

export { ColorSwatch };
