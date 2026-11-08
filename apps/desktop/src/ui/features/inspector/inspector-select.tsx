import { UiSelect } from "@design-studio/ui";
import type { ReactElement } from "react";

interface InspectorSelectProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly isDisabled: boolean;
  readonly options: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly onChange: (value: string) => void;
}

const InspectorSelect = ({
  id,
  label,
  value,
  placeholder,
  isDisabled,
  options,
  onChange,
}: InspectorSelectProps): ReactElement => (
  <UiSelect
    id={id}
    aria-label={label}
    value={value}
    placeholder={placeholder}
    disabled={isDisabled}
    options={options}
    onChange={onChange}
  />
);

export { InspectorSelect };
