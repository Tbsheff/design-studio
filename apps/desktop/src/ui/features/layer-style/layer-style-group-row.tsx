import type { ChangeEvent, ReactElement } from "react";

import type { GroupChoice } from "./layer-style-model.js";

import styles from "./layer-style.module.css";

interface LayerStyleGroupRowProps {
  readonly choice: GroupChoice;
  readonly isChecked: boolean;
  readonly onToggle: (event: ChangeEvent<HTMLInputElement>) => void;
}

const LayerStyleGroupRow = ({
  choice,
  isChecked,
  onToggle,
}: LayerStyleGroupRowProps): ReactElement => (
  <label className={styles.group}>
    <input
      checked={isChecked}
      name={choice.group}
      onChange={onToggle}
      type="checkbox"
    />
    {choice.label}
  </label>
);

export { LayerStyleGroupRow };
