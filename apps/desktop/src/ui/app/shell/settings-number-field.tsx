import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

interface SettingsNumberFieldProps {
  readonly ariaLabel: string;
  readonly label: string;
  readonly max: number;
  readonly min: number;
  readonly name: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string | null;
  readonly step: number;
  readonly value: string;
}

const SettingsNumberField = ({
  ariaLabel,
  label,
  max,
  min,
  name,
  onChange,
  placeholder,
  step,
  value,
}: SettingsNumberFieldProps): ReactElement => {
  const changeValue = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onChange(event.target.value),
    [onChange]
  );

  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        aria-label={ariaLabel}
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder ?? ""}
        value={value}
        onChange={changeValue}
      />
    </label>
  );
};

export { SettingsNumberField };
