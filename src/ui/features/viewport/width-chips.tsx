import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ChipButton } from "./deps.js";
import { WIDTH_CHOICES } from "./matrix-model.js";

import styles from "./viewport.module.css";

interface WidthChipsProps {
  readonly onPick: (value: number) => void;
  readonly widths: readonly number[];
}

const WidthChips = ({ onPick, widths }: WidthChipsProps): ReactElement => (
  <fieldset aria-label={copy.widthLabel} className={styles.chips}>
    {WIDTH_CHOICES.map((entry) => (
      <ChipButton
        isOn={widths.includes(entry)}
        key={entry}
        label={String(entry)}
        onPick={onPick}
        tip={null}
        value={entry}
      />
    ))}
  </fieldset>
);

export { WidthChips };
