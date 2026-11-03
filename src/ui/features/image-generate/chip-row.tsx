import type { ReactElement } from "react";

import { ChipButton } from "./chip-button.js";

import styles from "./image-generate.module.css";

interface ChipRowProps<Value extends string> {
  readonly choices: readonly Value[];
  readonly label: string;
  readonly labels: Readonly<Record<Value, string>>;
  readonly onPick: (value: Value) => void;
  readonly value: Value;
}

const ChipRow = <Value extends string>({
  choices,
  label,
  labels,
  onPick,
  value,
}: ChipRowProps<Value>): ReactElement => (
  <fieldset aria-label={label} className={styles.chips}>
    {choices.map((choice) => (
      <ChipButton
        isOn={choice === value}
        key={choice}
        label={labels[choice]}
        value={choice}
        onPick={onPick}
      />
    ))}
  </fieldset>
);

export { ChipRow };
