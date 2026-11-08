import type { ReactElement } from "react";

import type { MeasureRow } from "./dev-note-model.js";

import styles from "./dev-note.module.css";

interface MeasureLineProps {
  readonly row: MeasureRow;
}

const MeasureLine = ({ row }: MeasureLineProps): ReactElement => (
  <tr>
    <th className={styles.cellLabel} scope="row">
      {row.label}
    </th>
    <td className={styles.cellValue}>{row.value}</td>
    <td className={styles.cellToken}>{row.token}</td>
  </tr>
);

export { MeasureLine };

export type { MeasureLineProps };
