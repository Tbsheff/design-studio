import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { STACKING_OVERFLOWS } from "./deps.js";
import type { OverflowAxis } from "./stacking-model.js";

import styles from "./stacking.module.css";

interface OverflowSelectProps {
  readonly axis: OverflowAxis;
  readonly disabled: boolean;
  readonly value: string;
  readonly onPick: (axis: OverflowAxis, next: string | null) => void;
}

const OVERFLOW_OPTIONS: readonly UiSelectOption[] = [
  { label: copy.unset, value: "" },
  ...STACKING_OVERFLOWS.map((overflow) => ({
    label: copy.overflow[overflow],
    value: overflow,
  })),
];

const OverflowSelect = ({
  axis,
  disabled,
  value,
  onPick,
}: OverflowSelectProps): ReactElement => {
  const id = `stacking-${axis}`;

  const pickOverflow = useCallback(
    (next: string): void => {
      onPick(axis, next || null);
    },
    [axis, onPick]
  );

  return (
    <div className="ins-field select">
      <label className={`${styles.label} ${styles.wide}`} htmlFor={id}>
        {copy.axisLabel[axis]}
      </label>
      <UiSelect
        aria-label={copy.axisLabel[axis]}
        disabled={disabled}
        id={id}
        options={OVERFLOW_OPTIONS}
        tip={copy.axisTip[axis]}
        value={value}
        onChange={pickOverflow}
      />
    </div>
  );
};

export { OverflowSelect };
