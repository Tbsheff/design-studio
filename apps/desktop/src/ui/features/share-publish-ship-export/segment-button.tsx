import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "./pick.js";

const RADIO_ROLE = "radio";

interface SegmentButtonProps<Value extends string | number> {
  readonly id: Value;
  readonly label: string;
  readonly icon: IconName | null;
  readonly isOn: boolean;
  readonly offTip: string | null;
  readonly onChange: (value: Value) => void;
}

const SegmentButton = <Value extends string | number>({
  icon,
  id,
  isOn,
  label,
  offTip,
  onChange,
}: SegmentButtonProps<Value>): ReactElement => {
  const isOff = offTip !== null;

  const selectOption = useCallback(() => {
    if (!isOff) {
      onChange(id);
    }
  }, [id, isOff, onChange]);

  return (
    <button
      type="button"
      role={RADIO_ROLE}
      aria-checked={isOn}
      aria-disabled={isOff}
      data-tip={offTip}
      tabIndex={pick(isOn, 0, -1)}
      className={pick(isOn, "on", "")}
      onClick={selectOption}
    >
      {icon && <Icon name={icon} size={14} />}
      {label}
    </button>
  );
};

export { SegmentButton };
