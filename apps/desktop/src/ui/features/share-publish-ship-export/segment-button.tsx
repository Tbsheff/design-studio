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
  readonly onChange: (value: Value) => void;
}

const SegmentButton = <Value extends string | number>({
  icon,
  id,
  isOn,
  label,
  onChange,
}: SegmentButtonProps<Value>): ReactElement => {
  const selectOption = useCallback(() => {
    onChange(id);
  }, [id, onChange]);

  return (
    <button
      type="button"
      role={RADIO_ROLE}
      aria-checked={isOn}
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
