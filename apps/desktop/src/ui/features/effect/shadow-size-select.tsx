import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ShadowSize } from "./deps.js";
import type { ShadowSizePick } from "./effect-model.js";

interface ShadowSizeSelectProps {
  readonly disabled: boolean;
  readonly sizes: readonly ShadowSize[];
  readonly value: ShadowSize | null;
  readonly onPick: (pick: ShadowSizePick) => void;
}

const NONE_OPTION: UiSelectOption<ShadowSizePick> = {
  label: copy.shadowSize.none,
  value: "none",
};

const CUSTOM_OPTION: UiSelectOption<ShadowSizePick> = {
  label: copy.shadowSize.custom,
  value: "custom",
};

const toSizeOptions = (
  sizes: readonly ShadowSize[]
): UiSelectOption<ShadowSizePick>[] => [
  NONE_OPTION,
  ...sizes.map((size) => ({ label: copy.shadowSize.sizes[size], value: size })),
  CUSTOM_OPTION,
];

const ShadowSizeSelect = ({
  disabled,
  sizes,
  value,
  onPick,
}: ShadowSizeSelectProps): ReactElement => {
  const options = useMemo(() => toSizeOptions(sizes), [sizes]);

  return (
    <span data-tip={copy.shadowSize.tip}>
      <UiSelect
        aria-label={copy.shadowSize.label}
        disabled={disabled}
        options={options}
        value={value ?? "custom"}
        onChange={onPick}
      />
    </span>
  );
};

export { ShadowSizeSelect };

export type { ShadowSizeSelectProps };
