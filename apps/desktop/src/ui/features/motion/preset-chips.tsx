import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ENTRANCE_PRESETS } from "./deps.js";
import type { EntrancePreset } from "./deps.js";
import { PresetChip } from "./preset-chip.js";

import styles from "./motion.module.css";

interface PresetChipsProps {
  readonly disabled: boolean;
  readonly value: EntrancePreset;
  readonly onPick: (preset: EntrancePreset) => void;
}

const PresetChips = ({
  disabled,
  value,
  onPick,
}: PresetChipsProps): ReactElement => (
  <fieldset className={styles.chips}>
    <legend className={styles.legend}>{copy.presetLabel}</legend>
    {ENTRANCE_PRESETS.map((preset) => (
      <PresetChip
        disabled={disabled}
        key={preset}
        preset={preset}
        pressed={preset === value}
        onPick={onPick}
      />
    ))}
  </fieldset>
);

export { PresetChips };
