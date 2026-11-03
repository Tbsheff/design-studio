import type { ReactElement } from "react";

import { STRESS_MODES } from "./content-model.js";
import type { ContentMode, StressMode } from "./content-model.js";
import { copy } from "./copy.js";
import { ChipButton } from "./deps.js";

import styles from "./content.module.css";

interface StressChipsProps {
  readonly mode: ContentMode;
  readonly onPick: (value: StressMode) => void;
}

const StressChips = ({ mode, onPick }: StressChipsProps): ReactElement => (
  <div className={styles.chips}>
    {STRESS_MODES.map((entry) => (
      <ChipButton
        isOn={mode === entry}
        key={entry}
        label={copy.mode[entry]}
        onPick={onPick}
        tip={copy.modeTip[entry]}
        value={entry}
      />
    ))}
  </div>
);

export { StressChips };
