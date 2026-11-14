import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useId, useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ShadowSize } from "./deps.js";
import { toItemSize, toKindSizes } from "./effect-model.js";
import type { ShadowSizePick, ShadowSizes } from "./effect-model.js";
import type { EffectItem } from "./effect-types.js";

import styles from "./effect.module.css";

interface ShadowSizeSelectProps {
  readonly disabled: boolean;
  readonly item: EffectItem;
  readonly sizes: ShadowSizes;
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
  item,
  sizes,
  onPick,
}: ShadowSizeSelectProps): ReactElement | null => {
  const kindSizes = useMemo(() => toKindSizes(item, sizes), [item, sizes]);
  const options = useMemo(() => toSizeOptions(kindSizes), [kindSizes]);
  const sizeId = useId();

  if (kindSizes.length === 0) {
    return null;
  }

  return (
    <div
      className={`ins-field select ${styles.wide}`}
      data-tip={copy.shadowSize.tip}
    >
      <label className={styles.label} htmlFor={sizeId}>
        {copy.shadowSize.label}
      </label>
      <UiSelect
        aria-label={copy.shadowSize.label}
        disabled={disabled}
        id={sizeId}
        options={options}
        value={toItemSize(item) ?? "custom"}
        onChange={onPick}
      />
    </div>
  );
};

export { ShadowSizeSelect };

export type { ShadowSizeSelectProps };
