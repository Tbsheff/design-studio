import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toTweakChipText } from "./suggestion-model.js";
import type { TweakChip as TweakChipKind } from "./suggestion-model.js";

import styles from "./suggestion.module.css";

interface TweakChipProps {
  readonly chip: TweakChipKind;
  readonly onTweaks: () => void;
}

const TweakChip = ({ chip, onTweaks }: TweakChipProps): ReactElement => (
  <button
    className={styles.chip}
    data-kind="tweaks"
    data-tip={copy.tweaksTip}
    data-tip-side="top"
    type="button"
    onClick={onTweaks}
  >
    {toTweakChipText(chip)}
  </button>
);

export { TweakChip };
