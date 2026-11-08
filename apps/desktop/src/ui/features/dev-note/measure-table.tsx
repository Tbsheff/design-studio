import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toMeasureRows } from "./dev-note-model.js";
import type { Measurements } from "./dev-note-model.js";
import { MeasureLine } from "./measure-line.js";

import styles from "./dev-note.module.css";

interface MeasureTableProps {
  readonly measurements: Measurements;
}

const MeasureTable = ({ measurements }: MeasureTableProps): ReactElement => (
  <table aria-label={copy.measuredTitle} className={styles.table}>
    <tbody>
      {toMeasureRows(measurements).map((row) => (
        <MeasureLine key={row.label} row={row} />
      ))}
    </tbody>
  </table>
);

export { MeasureTable };

export type { MeasureTableProps };
