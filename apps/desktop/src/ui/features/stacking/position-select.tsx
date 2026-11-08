import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { STACKING_POSITIONS } from "./deps.js";

import styles from "./stacking.module.css";

interface PositionSelectProps {
  readonly disabled: boolean;
  readonly value: string;
  readonly onPick: (next: string) => void;
}

const POSITION_ID = "stacking-position";

const POSITION_OPTIONS: readonly UiSelectOption[] = [
  { label: copy.unset, value: "" },
  ...STACKING_POSITIONS.map((position) => ({
    label: copy.positionLabel[position],
    value: position,
  })),
];

const PositionSelect = ({
  disabled,
  value,
  onPick,
}: PositionSelectProps): ReactElement => (
  <div className="ins-field select">
    <label className={`${styles.label} ${styles.wide}`} htmlFor={POSITION_ID}>
      {copy.position}
    </label>
    <UiSelect
      aria-label={copy.position}
      disabled={disabled}
      id={POSITION_ID}
      options={POSITION_OPTIONS}
      tip={copy.positionTip}
      value={value}
      onChange={onPick}
    />
  </div>
);

export { PositionSelect };
