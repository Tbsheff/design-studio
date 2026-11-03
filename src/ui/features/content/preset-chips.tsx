import type { ReactElement } from "react";

import { ChipButton } from "./chip-button.js";
import { PRESETS } from "./content-model.js";
import type { ContentMode, ContentPreset } from "./content-model.js";
import { copy } from "./copy.js";

import styles from "./content.module.css";

interface PresetChipsProps {
  readonly mode: ContentMode;
  readonly onPick: (value: ContentPreset) => void;
  readonly preset: ContentPreset;
}

const PresetChips = ({
  mode,
  onPick,
  preset,
}: PresetChipsProps): ReactElement => (
  <div className={styles.chips}>
    {PRESETS.map((entry) => (
      <ChipButton
        isOn={mode === "sample" && preset === entry}
        key={entry}
        label={copy.preset[entry]}
        onPick={onPick}
        tip={copy.presetTip[entry]}
        value={entry}
      />
    ))}
  </div>
);

export { PresetChips };
