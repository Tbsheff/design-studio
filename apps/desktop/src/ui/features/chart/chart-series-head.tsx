import { useCallback } from "react";
import type { ChangeEvent, Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartSeriesHeadProps {
  readonly canRemove: boolean;
  readonly dispatch: Dispatch<DraftAction>;
  readonly index: number;
  readonly label: string;
}

const ChartSeriesHead = ({
  canRemove,
  dispatch,
  index,
  label,
}: ChartSeriesHeadProps): ReactElement => {
  const handleLabel = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      dispatch({ index, kind: "set-series-label", text: event.target.value }),
    [dispatch, index]
  );

  const handleRemove = useCallback(
    (): void => dispatch({ index, kind: "remove-series" }),
    [dispatch, index]
  );

  return (
    <th className={styles.head} scope="col">
      <input
        aria-label={copy.seriesLabel}
        className={styles.input}
        onChange={handleLabel}
        value={label}
      />
      <button
        aria-label={copy.removeSeries}
        className={styles.icon}
        data-tip={copy.removeSeries}
        disabled={!canRemove}
        onClick={handleRemove}
        type="button"
      >
        {copy.removeMark}
      </button>
    </th>
  );
};

export { ChartSeriesHead };
