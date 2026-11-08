import type { VariantGroup } from "@design-studio/contracts/props";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { InspectorSelect } from "./inspector-select.js";

interface VariantPickerProps {
  readonly groups: VariantGroup[];
  readonly group: VariantGroup;
  readonly value: string;
  readonly onProp: (prop: string) => void;
  readonly onValue: (value: string) => void;
}

const VariantPicker = ({
  groups,
  group,
  value,
  onProp,
  onValue,
}: VariantPickerProps): ReactElement => {
  const propOptions = useMemo(
    () => groups.map((entry) => ({ label: entry.prop, value: entry.prop })),
    [groups]
  );

  const valueOptions = useMemo(
    () =>
      group.options.map((entry) => ({
        label: entry.value,
        value: entry.value,
      })),
    [group]
  );

  return (
    <div className="ins-grid">
      <div className="ins-field select">
        <InspectorSelect
          id="prp-variant-prop"
          label={copy.variantProp}
          value={group.prop}
          placeholder={copy.dash}
          isDisabled={false}
          options={propOptions}
          onChange={onProp}
        />
      </div>
      <div className="ins-field select">
        <InspectorSelect
          id="prp-variant-value"
          label={copy.variantValue}
          value={value}
          placeholder={copy.dash}
          isDisabled={false}
          options={valueOptions}
          onChange={onValue}
        />
      </div>
    </div>
  );
};

export { VariantPicker };
