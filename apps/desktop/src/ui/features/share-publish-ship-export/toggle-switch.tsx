import type { ReactElement } from "react";

import { pick } from "./pick.js";

interface ToggleSwitchProps {
  readonly label: string;
  readonly isOn: boolean;
  readonly isDisabled: boolean;
  readonly onToggle: () => void;
}

const SWITCH_ROLE = "switch";

const ToggleSwitch = ({
  isDisabled,
  isOn,
  label,
  onToggle,
}: ToggleSwitchProps): ReactElement => (
  <button
    type="button"
    role={SWITCH_ROLE}
    aria-checked={isOn}
    aria-label={label}
    className={`export-switch${pick(isOn, " on", "")}`}
    disabled={isDisabled}
    onClick={onToggle}
  >
    <span className="export-switch-knob" />
  </button>
);

export { ToggleSwitch };
