import { useCallback } from "react";
import type { ChangeEvent, Dispatch, ReactElement } from "react";

import { ChartCell } from "./chart-cell.js";
import type { DraftAction } from "./chart-draft-model.js";
import type { DraftRow, DraftSeries } from "./chart-model.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartRowProps {
  readonly dispatch: Dispatch<DraftAction>;
  readonly index: number;
  readonly row: DraftRow;
  readonly series: readonly DraftSeries[];
}

const ChartRow = ({
  dispatch,
  index,
  row,
  series,
}: ChartRowProps): ReactElement => {
  const handleLabel = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      dispatch({ index, kind: "set-row-label", text: event.target.value }),
    [dispatch, index]
  );

  const handleRemove = useCallback(
    (): void => dispatch({ index, kind: "remove-row" }),
    [dispatch, index]
  );

  return (
    <tr>
      <th scope="row">
        <input
          aria-label={copy.labelHeader}
          className={styles.input}
          onChange={handleLabel}
          value={row.label}
        />
      </th>
      {series.map((item, column) => (
        <ChartCell
          column={column}
          dispatch={dispatch}
          index={index}
          key={item.key}
          text={row.values[column] ?? ""}
        />
      ))}
      <td>
        <button
          aria-label={copy.removeRow}
          className={styles.icon}
          data-tip={copy.removeRow}
          onClick={handleRemove}
          type="button"
        >
          {copy.removeMark}
        </button>
      </td>
    </tr>
  );
};

export { ChartRow };
