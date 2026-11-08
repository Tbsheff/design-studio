import { useCallback } from "react";
import type { Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartTableActionsProps {
  readonly canAddRow: boolean;
  readonly canAddSeries: boolean;
  readonly dispatch: Dispatch<DraftAction>;
}

const ChartTableActions = ({
  canAddRow,
  canAddSeries,
  dispatch,
}: ChartTableActionsProps): ReactElement => {
  const handleAddRow = useCallback(
    (): void => dispatch({ kind: "add-row" }),
    [dispatch]
  );

  const handleAddSeries = useCallback(
    (): void => dispatch({ kind: "add-series" }),
    [dispatch]
  );

  return (
    <div className={styles.actions}>
      <button
        className={styles.small}
        disabled={!canAddRow}
        onClick={handleAddRow}
        type="button"
      >
        {copy.addRow}
      </button>
      <button
        className={styles.small}
        disabled={!canAddSeries}
        onClick={handleAddSeries}
        type="button"
      >
        {copy.addSeries}
      </button>
    </div>
  );
};

export { ChartTableActions };
