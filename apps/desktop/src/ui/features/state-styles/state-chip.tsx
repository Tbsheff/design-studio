import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { StateDot } from "./state-dot.js";
import type { ChipId } from "./state-styles-model.js";

import styles from "./state-styles.module.css";

interface StateChipProps {
  readonly chip: ChipId;
  readonly hasStyles: boolean;
  readonly isDisabled: boolean;
  readonly isOn: boolean;
  readonly isUnavailable: boolean;
  readonly onPick: (chip: ChipId) => void;
}

const classOf = (isOn: boolean): string => {
  if (isOn) {
    return `${styles.chip} ${styles.on}`;
  }

  return styles.chip ?? "";
};

const tipOf = (
  chip: ChipId,
  hasStyles: boolean,
  isUnavailable: boolean
): string => {
  if (isUnavailable) {
    return copy.groupOff;
  }

  if (hasStyles) {
    return `${copy.chipTip[chip]}. ${copy.hasStyles}`;
  }

  return copy.chipTip[chip];
};

const StateChip = ({
  chip,
  hasStyles,
  isDisabled,
  isOn,
  isUnavailable,
  onPick,
}: StateChipProps): ReactElement => {
  const handlePick = useCallback(() => {
    if (!isUnavailable) {
      onPick(chip);
    }
  }, [chip, isUnavailable, onPick]);

  return (
    <button
      aria-disabled={isUnavailable}
      aria-pressed={isOn}
      className={classOf(isOn)}
      data-tip={tipOf(chip, hasStyles, isUnavailable)}
      disabled={isDisabled}
      onClick={handlePick}
      type="button"
    >
      {copy.label[chip]}
      <StateDot isShown={hasStyles} />
    </button>
  );
};

export { StateChip };
