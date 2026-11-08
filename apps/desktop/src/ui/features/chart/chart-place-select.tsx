import { useCallback } from "react";
import type { ChangeEvent, Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import { isPosition, POSITIONS } from "./chart-model.js";
import type { ChartPosition } from "./chart-model.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartPlaceSelectProps {
  readonly dispatch: Dispatch<DraftAction>;
  readonly position: ChartPosition;
}

const ChartPlaceSelect = ({
  dispatch,
  position,
}: ChartPlaceSelectProps): ReactElement => {
  const handlePosition = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const { value } = event.target;

      if (isPosition(value)) {
        dispatch({ kind: "set-position", position: value });
      }
    },
    [dispatch]
  );

  return (
    <select
      aria-label={copy.placeLabel}
      className={styles.select}
      onChange={handlePosition}
      value={position}
    >
      {POSITIONS.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export { ChartPlaceSelect };
