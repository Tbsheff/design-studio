import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

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

const toModelOptions = (
  options: readonly ModelOption[],
  model: string
): readonly UiSelectOption[] => {
  const list = options.map((option) => ({
    label: option.label,
    value: option.id,
  }));

  if (options.some((option) => option.id === model)) {
    return list;
  }

  return [...list, { label: model, value: model }];
};

const SettingsModelField = ({
  model,
  onChange,
  options,
}: SettingsModelFieldProps): ReactElement => {
  const list = useMemo(() => toModelOptions(options, model), [options, model]);

  return (
    <label className="field">
      <span>{copy.model}</span>
      <UiSelect
        aria-label="Model"
        options={list}
        value={model}
        onChange={onChange}
      />
    </label>
  );
};

export { SettingsModelField };
