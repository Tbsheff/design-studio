import type { ReactElement } from "react";

import type { TableRowModel } from "./data-model-model.js";
import { TableRow } from "./table-row.js";

interface TableBodyProps {
  readonly columns: readonly string[];
  readonly rows: readonly TableRowModel[];
}

const TableBody = ({ columns, rows }: TableBodyProps): ReactElement => (
  <tbody>
    {rows.map((row) => (
      <TableRow key={row.key} columns={columns} row={row} />
    ))}
  </tbody>
);

export { TableBody };
