import { useCallback } from "react";
import type { ChangeEvent, Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import { toNumber } from "./chart-model.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartCellProps {
  readonly column: number;
  readonly dispatch: Dispatch<DraftAction>;
  readonly index: number;
  readonly text: string;
}

const ChartCell = ({
  column,
  dispatch,
  index,
  text,
}: ChartCellProps): ReactElement => {
  const handleSetCell = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      dispatch({ column, index, kind: "set-cell", text: event.target.value }),
    [column, dispatch, index]
  );

  return (
    <td>
      <input
        aria-invalid={toNumber(text) === null}
        aria-label={copy.valueLabel}
        className={styles.input}
        inputMode="decimal"
        onChange={handleSetCell}
        value={text}
      />
    </td>
  );
};

export { ChartCell };
