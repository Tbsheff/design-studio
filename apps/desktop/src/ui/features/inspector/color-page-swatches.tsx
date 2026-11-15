import type { ReactElement } from "react";

import { ColorPageSwatch } from "./color-page-swatch.js";
import { copy } from "./copy.js";
import type { ColorPopupState } from "./use-color-popup.js";

import styles from "./color-popup.module.css";

const ColorPageSwatches = ({
  popup,
}: {
  readonly popup: ColorPopupState;
}): ReactElement | null => {
  const { pageColors, commitValue } = popup;

  if (pageColors.length === 0) {
    return null;
  }

  return (
    <div className={styles.rows}>
      <p className={styles.pageHead}>{copy.colorOnPage}</p>
      <ul className={styles.pageList}>
        {pageColors.map((color) => (
          <ColorPageSwatch
            key={color.value}
            color={color}
            onPick={commitValue}
          />
        ))}
      </ul>
    </div>
  );
};

export { ColorPageSwatches };
