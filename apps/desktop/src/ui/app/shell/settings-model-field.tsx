import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy";

interface ModelOption {
  readonly id: string;
  readonly label: string;
}

interface SettingsModelFieldProps {
  readonly model: string;
  readonly onChange: (model: string) => void;
  readonly options: readonly ModelOption[];
}

const SettingsModelField = ({
  model,
  onChange,
  options,
}: SettingsModelFieldProps): ReactElement => {
  const known = options.some((option) => option.id === model);

  const changeModel = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void =>
      onChange(event.target.value),
    [onChange]
  );

  return (
    <label className="field">
      <span>{copy.model}</span>
      <select
        name="model"
        className="select"
        aria-label="Model"
        value={model}
        onChange={changeModel}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
        {!known && <option value={model}>{model}</option>}
      </select>
    </label>
  );
};

export { SettingsModelField };
