import { useCallback } from "react";
import type { ReactElement } from "react";

interface ChipButtonProps<Value extends string> {
  readonly isOn: boolean;
  readonly label: string;
  readonly onPick: (value: Value) => void;
  readonly value: Value;
}

const classOf = (isOn: boolean): string => {
  if (isOn) {
    return "btn small on";
  }

  return "btn small ghost";
};

const ChipButton = <Value extends string>({
  isOn,
  label,
  onPick,
  value,
}: ChipButtonProps<Value>): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(value);
  }, [onPick, value]);

  return (
    <button
      aria-pressed={isOn}
      className={classOf(isOn)}
      type="button"
      onClick={handlePick}
    >
      {label}
    </button>
  );
};

export { ChipButton };
