import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { TextRangeButtons } from "./text-range-buttons.js";
import { TextRangeLinkField } from "./text-range-link-field.js";
import { keepFocus } from "./text-range-model.js";
import { TextRangeSwatch } from "./text-range-swatch.js";
import { useTextRangeColors } from "./use-text-range-colors.js";
import { useTextRange } from "./use-text-range.js";
import type { TextRangeSetup } from "./use-text-range.js";

import styles from "./text-range.module.css";

const TextRangeBar = (props: TextRangeSetup): ReactElement | null => {
  const view = useTextRange(props);
  const [isColorOpen, setIsColorOpen] = useState(false);

  const colors = useTextRangeColors(
    props.projectId,
    props.directionId,
    isColorOpen
  );

  const handleColorToggle = useCallback(
    (): void => setIsColorOpen((isOpen) => !isOpen),
    []
  );

  const { spot } = view;

  const place = useMemo(
    () => ({ left: spot?.left ?? 0, top: spot?.top ?? 0 }),
    [spot]
  );

  if (spot === null && view.notice !== null) {
    return (
      <output aria-live="polite" className="ds-toast-slot">
        <div className="ds-toast">{view.notice}</div>
      </output>
    );
  }

  if (spot === null) {
    return null;
  }

  return (
    <div
      aria-label={copy.toolbarLabel}
      className={styles.bar}
      onMouseDown={keepFocus}
      role="toolbar"
      style={place}
      tabIndex={-1}
    >
      <TextRangeButtons onColorToggle={handleColorToggle} view={view} />
      {isColorOpen && (
        <fieldset aria-label={copy.colorLabel} className={styles.swatches}>
          {colors.map((color) => (
            <TextRangeSwatch
              key={color.className}
              color={color}
              onPick={view.handleColor}
            />
          ))}
          {colors.length === 0 && (
            <span className={styles.note}>{copy.colorNone}</span>
          )}
        </fieldset>
      )}
      {view.isLinkOpen && (
        <TextRangeLinkField onSubmit={view.handleLinkSubmit} />
      )}
      {view.isDirty && <p className={styles.note}>{copy.dirty}</p>}
      {view.notice !== null && <p className={styles.note}>{view.notice}</p>}
      {view.failure !== null && (
        <p className={`${styles.note} ${styles.error}`} role="alert">
          {view.failure}
        </p>
      )}
    </div>
  );
};

export { TextRangeBar };
