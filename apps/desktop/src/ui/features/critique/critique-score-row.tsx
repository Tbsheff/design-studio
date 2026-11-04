import type { ReactElement } from "react";

import type { ScoreRow } from "./critique-model.js";

import styles from "./critique.module.css";

interface ScoreItemProps {
  readonly row: ScoreRow;
}

const CritiqueScoreRow = ({ row }: ScoreItemProps): ReactElement => (
  <li className={styles.score}>
    <span className={styles.scoreLabel}>{row.label}</span>
    <span className={styles.scoreValue}>{row.value}</span>
  </li>
);

export { CritiqueScoreRow };
