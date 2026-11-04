import { useCallback } from "react";
import type { ReactElement } from "react";

import { PRESET_LABELS } from "./copy.js";
import type { EntrancePreset } from "./deps.js";

import styles from "./motion.module.css";

interface PresetChipProps {
  readonly disabled: boolean;
  readonly preset: EntrancePreset;
  readonly pressed: boolean;
  readonly onPick: (preset: EntrancePreset) => void;
}

const PresetChip = ({
  disabled,
  preset,
  pressed,
  onPick,
}: PresetChipProps): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(preset);
  }, [onPick, preset]);

  return (
    <button
      aria-pressed={pressed}
      className={styles.chip}
      disabled={disabled}
      type="button"
      onClick={handlePick}
    >
      {PRESET_LABELS[preset]}
    </button>
  );
};

export { PresetChip };
