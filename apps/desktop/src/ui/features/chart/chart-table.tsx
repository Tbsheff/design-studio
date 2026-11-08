import type { Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import { ROWS_MAX, SERIES_MAX } from "./chart-model.js";
import type { ChartDraft } from "./chart-model.js";
import { ChartTableActions } from "./chart-table-actions.js";
import { ChartTableBody } from "./chart-table-body.js";
import { ChartTableHead } from "./chart-table-head.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartTableProps {
  readonly dispatch: Dispatch<DraftAction>;
  readonly draft: ChartDraft;
}

const ChartTable = ({ dispatch, draft }: ChartTableProps): ReactElement => {
  const canAddSeries = draft.kind !== "pie" && draft.series.length < SERIES_MAX;
  const canRemove = draft.series.length > 1;

  return (
    <div className={styles.tableBox}>
      <table aria-label={copy.dataLabel} className={styles.table}>
        <ChartTableHead
          canRemove={canRemove}
          dispatch={dispatch}
          series={draft.series}
        />
        <ChartTableBody
          dispatch={dispatch}
          rows={draft.rows}
          series={draft.series}
        />
      </table>
      <ChartTableActions
        canAddRow={draft.rows.length < ROWS_MAX}
        canAddSeries={canAddSeries}
        dispatch={dispatch}
      />
    </div>
  );
};

export { ChartTable };
