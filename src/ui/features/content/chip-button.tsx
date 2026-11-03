import { useCallback } from "react";
import type { ReactElement } from "react";

import styles from "./content.module.css";

interface ChipButtonProps<Value extends string> {
  readonly isOn: boolean;
  readonly label: string;
  readonly onPick: (value: Value) => void;
  readonly tip: string;
  readonly value: Value;
}

const classOf = (isOn: boolean): string => {
  if (isOn) {
    return `${styles.chip} ${styles.on}`;
  }

  return styles.chip ?? "";
};

const ChipButton = <Value extends string>({
  isOn,
  label,
  onPick,
  tip,
  value,
}: ChipButtonProps<Value>): ReactElement => {
  const handlePick = useCallback(() => onPick(value), [onPick, value]);

  return (
    <button
      aria-pressed={isOn}
      className={classOf(isOn)}
      data-tip={tip}
      onClick={handlePick}
      type="button"
    >
      {label}
    </button>
  );
};

export { ChipButton };
