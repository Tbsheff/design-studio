import type { ReactElement } from "react";

import type { TableModel } from "./data-model-model.js";
import { TableBody } from "./table-body.js";
import { TableHead } from "./table-head.js";

import styles from "./data-model.module.css";

interface DataTableProps {
  readonly label: string;
  readonly table: TableModel;
}

const DataTable = ({ label, table }: DataTableProps): ReactElement => (
  <div className={styles.scroll}>
    <table className={styles.table} aria-label={label}>
      <TableHead columns={table.columns} />
      <TableBody columns={table.columns} rows={table.rows} />
    </table>
  </div>
);

export { DataTable };
