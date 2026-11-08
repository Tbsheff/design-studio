import { useCallback } from "react";
import type { ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { RADIO_ROLE } from "./aria-role-model.js";

const SegmentRadio = <Option extends string>({
  option,
  label,
  isOn,
  isDisabled,
  radio,
  onPick,
}: {
  option: Option;
  label: string;
  isOn: boolean;
  isDisabled: boolean;
  radio: {
    readonly ref: (el: HTMLButtonElement | null) => void;
    readonly tabIndex: number;
  };
  onPick: (option: Option) => void;
}): ReactElement => {
  const choose = useCallback(() => onPick(option), [onPick, option]);
  const { ref, tabIndex } = radio;

  return (
    <button
      ref={ref}
      tabIndex={tabIndex}
      type="button"
      role={RADIO_ROLE}
      aria-checked={isOn}
      disabled={isDisabled}
      className={cn(isOn && "on")}
      onClick={choose}
    >
      {label}
    </button>
  );
};

export { SegmentRadio };
