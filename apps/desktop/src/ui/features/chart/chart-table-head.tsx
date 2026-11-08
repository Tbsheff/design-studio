import type { Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import type { DraftSeries } from "./chart-model.js";
import { ChartSeriesHead } from "./chart-series-head.js";
import { copy } from "./copy.js";

interface ChartTableHeadProps {
  readonly canRemove: boolean;
  readonly dispatch: Dispatch<DraftAction>;
  readonly series: readonly DraftSeries[];
}

const ChartTableHead = ({
  canRemove,
  dispatch,
  series,
}: ChartTableHeadProps): ReactElement => (
  <thead>
    <tr>
      <th scope="col">{copy.labelHeader}</th>
      {series.map((item, index) => (
        <ChartSeriesHead
          canRemove={canRemove}
          dispatch={dispatch}
          index={index}
          key={item.key}
          label={item.label}
        />
      ))}
      <th scope="col">{copy.removeRow}</th>
    </tr>
  </thead>
);

export { ChartTableHead };
