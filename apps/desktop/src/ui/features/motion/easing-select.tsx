import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy, EASING_LABELS } from "./copy.js";
import { EASING_PRESETS } from "./deps.js";

interface EasingSelectProps {
  readonly disabled: boolean;
  readonly id: string;
  readonly value: string;
  readonly onValue: (easing: string) => void;
}

const PRESET_OPTIONS: readonly UiSelectOption[] = EASING_PRESETS.map(
  (name) => ({ label: EASING_LABELS[name], value: name })
);

const toEasingOptions = (value: string): readonly UiSelectOption[] => {
  if (PRESET_OPTIONS.some((option) => option.value === value)) {
    return PRESET_OPTIONS;
  }

  return [...PRESET_OPTIONS, { label: value, value }];
};

const EasingSelect = ({
  disabled,
  id,
  value,
  onValue,
}: EasingSelectProps): ReactElement => {
  const options = useMemo(() => toEasingOptions(value), [value]);

  return (
    <UiSelect
      aria-label={`${copy.easingLabel}: ${value}`}
      disabled={disabled}
      id={id}
      options={options}
      size="sm"
      value={value}
      onChange={onValue}
    />
  );
};

export { EasingSelect };
