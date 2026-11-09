import type { ReactElement } from "react";

import type { PreviewRowData } from "./data-fill-model.js";

interface PreviewRowProps {
  readonly kind: "body" | "head";
  readonly row: PreviewRowData;
}

const CELL_TAGS = { body: "td", head: "th" } as const;

const PreviewRow = ({ kind, row }: PreviewRowProps): ReactElement => {
  const Cell = CELL_TAGS[kind];

  return (
    <tr>
      {row.cells.map((cell) => (
        <Cell key={cell.id}>{cell.text}</Cell>
      ))}
    </tr>
  );
};

export { PreviewRow };
