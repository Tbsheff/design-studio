import type { ReactElement } from "react";

interface TableHeadProps {
  readonly columns: readonly string[];
}

const TableHead = ({ columns }: TableHeadProps): ReactElement => (
  <thead>
    <tr>
      {columns.map((column) => (
        <th key={column} scope="col">
          {column}
        </th>
      ))}
    </tr>
  </thead>
);

export { TableHead };
