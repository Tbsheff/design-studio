import { useCallback, useId } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./motion.module.css";

interface MsFieldProps {
  readonly disabled: boolean;
  readonly label: string;
  readonly max: number;
  readonly short: string;
  readonly value: number;
  readonly onValue: (value: number) => void;
}

const STEP = 10;

const clamp = (raw: string, max: number): number => {
  const value = Math.round(Number(raw));

  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.min(value, max);
};

const MsField = ({
  disabled,
  label,
  max,
  short,
  value,
  onValue,
}: MsFieldProps): ReactElement => {
  const id = useId();

  const handleTyped = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onValue(clamp(event.target.value, max));
    },
    [max, onValue]
  );

  return (
    <div className={styles.field}>
      <label className="ins-scrub static" htmlFor={id}>
        {short}
      </label>
      <span className={styles.number}>
        <input
          aria-label={label}
          className={styles.input}
          disabled={disabled}
          id={id}
          inputMode="numeric"
          max={max}
          min={0}
          step={STEP}
          type="number"
          value={value}
          onChange={handleTyped}
        />
        <span aria-hidden="true" className={styles.unit}>
          {copy.ms}
        </span>
      </span>
    </div>
  );
};

export { MsField };
