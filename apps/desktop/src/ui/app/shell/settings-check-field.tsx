import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { pick } from "../../platform/pick.js";

interface SettingsCheckFieldProps {
  readonly isChecked: boolean;
  readonly isDisabled: boolean;
  readonly label: string;
  readonly name: string;
  readonly onChange: (isChecked: boolean) => void;
}

const SettingsCheckField = ({
  isChecked,
  isDisabled,
  label,
  name,
  onChange,
}: SettingsCheckFieldProps): ReactElement => {
  const changeChecked = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onChange(event.target.checked),
    [onChange]
  );

  return (
    <label className={`check ${pick(isDisabled, "disabled", "")}`}>
      <input
        name={name}
        type="checkbox"
        checked={isChecked}
        disabled={isDisabled}
        onChange={changeChecked}
      />
      <span>{label}</span>
    </label>
  );
};

export { SettingsCheckField };
