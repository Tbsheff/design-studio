import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import styles from "./animation.module.css";

interface ChoiceSelectProps {
  readonly label: string;
  readonly onChoose: (value: string) => void;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly value: string;
}

const ChoiceSelect = ({
  label,
  onChoose,
  options,
  value,
}: ChoiceSelectProps): ReactElement => {
  const handleChoose = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onChoose(event.target.value);
    },
    [onChoose]
  );

  return (
    <select
      aria-label={label}
      className={styles.input}
      onChange={handleChoose}
      value={value}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export { ChoiceSelect };

export type { ChoiceSelectProps };
