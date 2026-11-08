import type { ReactElement } from "react";
import { useCallback } from "react";

import type { ToggleTweak } from "../../../shared/tweaks.js";
import { toSwitchClass } from "./tweaks-model.js";
import type { EditFn } from "./tweaks-model.js";

const TweakToggleInput = ({
  control,
  isOn,
  onEdit,
}: {
  readonly control: ToggleTweak;
  readonly isOn: boolean;
  readonly onEdit: EditFn;
}): ReactElement => {
  const toggle = useCallback(
    () => onEdit(control, !isOn),
    [onEdit, control, isOn]
  );

  return (
    <button
      id={`twk-${control.id}`}
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={control.label}
      className={toSwitchClass(isOn)}
      onClick={toggle}
    >
      <span className="twk-switch-knob" aria-hidden="true" />
    </button>
  );
};

export { TweakToggleInput };
