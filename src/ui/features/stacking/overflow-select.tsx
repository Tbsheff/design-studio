import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

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

const OverflowSelect = ({
  axis,
  disabled,
  value,
  onPick,
}: OverflowSelectProps): ReactElement => {
  const id = `stacking-${axis}`;

  const handlePick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onPick(axis, event.target.value || null);
    },
    [axis, onPick]
  );

  return (
    <label
      className="ins-field select"
      data-tip={copy.axisTip[axis]}
      htmlFor={id}
    >
      <span className={`${styles.label} ${styles.wide}`}>
        {copy.axisLabel[axis]}
      </span>
      <select
        aria-label={copy.axisLabel[axis]}
        className="ins-input"
        disabled={disabled}
        id={id}
        value={value}
        onChange={handlePick}
      >
        <option value="">{copy.unset}</option>
        {STACKING_OVERFLOWS.map((overflow) => (
          <option key={overflow} value={overflow}>
            {copy.overflow[overflow]}
          </option>
        ))}
      </select>
    </label>
  );
};

export { OverflowSelect };
