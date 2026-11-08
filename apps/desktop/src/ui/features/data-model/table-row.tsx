import type { ReactElement } from "react";

import type { TableRowModel } from "./data-model-model.js";

import styles from "./data-model.module.css";

interface TableRowProps {
  readonly columns: readonly string[];
  readonly row: TableRowModel;
}

const TableRow = ({ columns, row }: TableRowProps): ReactElement => (
  <tr>
    {row.cells.map((cell, column) => (
      <td key={columns[column]} className={styles.mono}>
        {cell}
      </td>
    ))}
  </tr>
);

export { TableRow };
