import type { Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import type { DraftRow, DraftSeries } from "./chart-model.js";
import { ChartRow } from "./chart-row.js";

interface ChartTableBodyProps {
  readonly dispatch: Dispatch<DraftAction>;
  readonly rows: readonly DraftRow[];
  readonly series: readonly DraftSeries[];
}

const ChartTableBody = ({
  dispatch,
  rows,
  series,
}: ChartTableBodyProps): ReactElement => (
  <tbody>
    {rows.map((row, index) => (
      <ChartRow
        dispatch={dispatch}
        index={index}
        key={row.id}
        row={row}
        series={series}
      />
    ))}
  </tbody>
);

export { ChartTableBody };
