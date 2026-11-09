import type { ReactElement } from "react";

import { toChangeText, toLabel, toTone, toValueText } from "./speed-model.js";
import type { SpeedNumberView } from "./speed-model.js";

import styles from "./speed.module.css";

interface SpeedRowProps {
  readonly row: SpeedNumberView;
}

const SpeedRow = ({ row }: SpeedRowProps): ReactElement => (
  <li className={styles.row}>
    <span className={`truncate ${styles.name}`}>{toLabel(row)}</span>
    <span className={`num ${styles.value}`}>{toValueText(row)}</span>
    <span className={`num ${styles.change}`} data-tone={toTone(row)}>
      {toChangeText(row)}
    </span>
  </li>
);

export { SpeedRow };
