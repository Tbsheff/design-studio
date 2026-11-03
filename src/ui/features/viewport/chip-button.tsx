import { useCallback } from "react";
import type { ReactElement } from "react";

import styles from "./viewport.module.css";

interface ChipButtonProps<Value extends number | string> {
  readonly isOn: boolean;
  readonly label: string;
  readonly onPick: (value: Value) => void;
  readonly value: Value;
}

const classOf = (isOn: boolean): string => {
  if (isOn) {
    return `${styles.chip} ${styles.on}`;
  }

  return styles.chip ?? "";
};

const ChipButton = <Value extends number | string>({
  isOn,
  label,
  onPick,
  value,
}: ChipButtonProps<Value>): ReactElement => {
  const handlePick = useCallback(() => onPick(value), [onPick, value]);

  return (
    <button
      aria-pressed={isOn}
      className={classOf(isOn)}
      onClick={handlePick}
      type="button"
    >
      {label}
    </button>
  );
};

export { ChipButton };
