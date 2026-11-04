import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy, EASING_LABELS } from "./copy.js";
import { EASING_PRESETS } from "./deps.js";

import styles from "./motion.module.css";

interface EasingSelectProps {
  readonly disabled: boolean;
  readonly id: string;
  readonly value: string;
  readonly onValue: (easing: string) => void;
}

const isNamed = (value: string): boolean =>
  (EASING_PRESETS as readonly string[]).includes(value);

const EasingSelect = ({
  disabled,
  id,
  value,
  onValue,
}: EasingSelectProps): ReactElement => {
  const handleEasingPick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onValue(event.target.value);
    },
    [onValue]
  );

  return (
    <select
      aria-label={`${copy.easingLabel}: ${value}`}
      className={styles.select}
      disabled={disabled}
      id={id}
      value={value}
      onChange={handleEasingPick}
    >
      {EASING_PRESETS.map((name) => (
        <option key={name} value={name}>
          {EASING_LABELS[name]}
        </option>
      ))}
      {!isNamed(value) && <option value={value}>{value}</option>}
    </select>
  );
};

export { EasingSelect };
