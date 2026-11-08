import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { toRadioClass } from "./viewport-radio-model.js";

interface OptionProps {
  readonly count: number;
  readonly isDisabled: boolean;
  readonly isOn: boolean;
  readonly label: string;
  readonly name: string;
  readonly onChange: (count: number) => void;
}

const VariationsControlOption = ({
  count,
  isDisabled,
  isOn,
  label,
  name,
  onChange,
}: OptionProps): ReactElement => {
  const onSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(Number(event.currentTarget.value));
    },
    [onChange]
  );

  return (
    <label className={toRadioClass(isOn, isDisabled)}>
      <input
        type="radio"
        name={name}
        value={count}
        aria-label={label}
        checked={isOn}
        disabled={isDisabled}
        onChange={onSelect}
      />
      {count}
    </label>
  );
};

export { VariationsControlOption };
