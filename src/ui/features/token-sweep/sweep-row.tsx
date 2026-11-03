import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Swatch } from "./swatch.js";
import { colorOf } from "./sweep-model.js";
import type { SweepChangeView } from "./sweep-model.js";

import styles from "./token-sweep.module.css";

interface SweepRowProps {
  readonly change: SweepChangeView;
  readonly isChecked: boolean;
  readonly onToggle: (id: string) => void;
}

const SweepRow = ({
  change,
  isChecked,
  onToggle,
}: SweepRowProps): ReactElement => {
  const handleToggle = useCallback(
    () => onToggle(change.id),
    [change.id, onToggle]
  );

  return (
    <li className={styles.row}>
      <label className={styles.label}>
        <input checked={isChecked} onChange={handleToggle} type="checkbox" />
        <Swatch color={colorOf(change, "before")} />
        <code className={styles.value}>{change.before}</code>
        <span aria-hidden="true">{copy.arrow}</span>
        <Swatch color={colorOf(change, "after")} />
        <code className={styles.value}>{change.after}</code>
        <span className={styles.where}>{`${change.file}:${change.line}`}</span>
      </label>
    </li>
  );
};

export { SweepRow };
