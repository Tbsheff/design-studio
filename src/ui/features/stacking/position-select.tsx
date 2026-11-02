import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { STACKING_POSITIONS } from "./deps.js";

import styles from "./stacking.module.css";

interface PositionSelectProps {
  readonly disabled: boolean;
  readonly value: string;
  readonly onPick: (next: string) => void;
}

const POSITION_ID = "stacking-position";

const PositionSelect = ({
  disabled,
  value,
  onPick,
}: PositionSelectProps): ReactElement => {
  const handlePick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onPick(event.target.value);
    },
    [onPick]
  );

  return (
    <label
      className="ins-field select"
      data-tip={copy.positionTip}
      htmlFor={POSITION_ID}
    >
      <span className={`${styles.label} ${styles.wide}`}>{copy.position}</span>
      <select
        aria-label={copy.position}
        className="ins-input"
        disabled={disabled}
        id={POSITION_ID}
        value={value}
        onChange={handlePick}
      >
        <option value="">{copy.unset}</option>
        {STACKING_POSITIONS.map((position) => (
          <option key={position} value={position}>
            {copy.positionLabel[position]}
          </option>
        ))}
      </select>
    </label>
  );
};

export { PositionSelect };
