import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

interface ChoiceSelectProps {
  readonly label: string;
  readonly onChoose: (value: string) => void;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly value: string;
}

const ChoiceSelect = ({
  label,
  onChoose,
  options,
  value,
}: ChoiceSelectProps): ReactElement => {
  const list = useMemo<readonly UiSelectOption[]>(
    () => options.map((option) => ({ label: option.label, value: option.id })),
    [options]
  );

  return (
    <UiSelect
      aria-label={label}
      options={list}
      size="sm"
      value={value}
      onChange={onChoose}
    />
  );
};

export { ChoiceSelect };

export type { ChoiceSelectProps };
