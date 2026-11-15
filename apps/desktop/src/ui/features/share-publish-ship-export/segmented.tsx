import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

import { moveRadioFocus } from "./radio-keys.js";
import { SegmentButton } from "./segment-button.js";

interface SegmentOption<Value extends string | number> {
  readonly id: Value;
  readonly label: string;
  readonly icon: IconName | null;
}

interface SegmentedProps<Value extends string | number> {
  readonly label: string;
  readonly value: Value;
  readonly options: readonly SegmentOption<Value>[];
  readonly onChange: (value: Value) => void;
}

const Segmented = <Value extends string | number>({
  label,
  onChange,
  options,
  value,
}: SegmentedProps<Value>): ReactElement => (
  <div
    className="segmented export-seg"
    role="radiogroup"
    tabIndex={-1}
    aria-label={label}
    onKeyDown={moveRadioFocus}
  >
    {options.map((option) => (
      <SegmentButton
        key={option.id}
        id={option.id}
        label={option.label}
        icon={option.icon}
        isOn={value === option.id}
        offTip={null}
        onChange={onChange}
      />
    ))}
  </div>
);

export { Segmented };

export type { SegmentOption };
