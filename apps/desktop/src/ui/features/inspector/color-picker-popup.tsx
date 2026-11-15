import { useCallback, useMemo, useRef } from "react";
import type { CSSProperties, ReactElement } from "react";

import type { ColorPickerSlotProps } from "../../domain/color-picker-slot.js";
import { ColorPopup } from "./color-popup.js";
import { copy } from "./copy.js";
import { isSwatchEmpty, toSwatchColor } from "./css-value-model.js";
import { toModifiedClass } from "./field-model.js";
import { useColorPopup } from "./use-color-popup.js";
import type { ColorPopupState, ColorTarget } from "./use-color-popup.js";

import styles from "./color-popup.module.css";

const ColorPickerPopup = ({
  label,
  swatch,
  value,
  onCommit,
  onPreview,
  onRevert,
}: ColorPickerSlotProps): ReactElement => {
  const base = useRef(value);

  const handleRevert = useCallback((): void => {
    onRevert(base.current);
  }, [onRevert]);

  const target = useMemo(
    (): ColorTarget => ({
      onCommit,
      onPreview,
      onRevert: handleRevert,
      value: swatch,
    }),
    [onCommit, onPreview, handleRevert, swatch]
  );

  const popup = useColorPopup(target);
  const { trigger, isOpen, handleToggle, beginDrag } = popup;

  const handleBegin = useCallback((): void => {
    base.current = value;
    beginDrag();
  }, [beginDrag, value]);

  const shown = useMemo(
    (): ColorPopupState => ({
      ...popup,
      beginDrag: handleBegin,
      pageColors: [],
    }),
    [popup, handleBegin]
  );

  const swatchStyle = useMemo(
    (): CSSProperties => ({ ["--swatch" as string]: toSwatchColor(swatch) }),
    [swatch]
  );

  return (
    <span
      ref={trigger}
      className={toModifiedClass("ins-swatch", "empty", isSwatchEmpty(swatch))}
      style={swatchStyle}
    >
      <button
        type="button"
        className={styles.swatchButton}
        aria-label={`${label}${copy.swatchSuffix}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={handleToggle}
      />
      {isOpen && <ColorPopup popup={shown} />}
    </span>
  );
};

export { ColorPickerPopup };
