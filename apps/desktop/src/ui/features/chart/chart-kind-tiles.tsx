import { useCallback } from "react";
import type { Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import { ChartKindTile } from "./chart-kind-tile.js";
import { KINDS } from "./chart-model.js";
import type { ChartKind } from "./chart-model.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartKindTilesProps {
  readonly dispatch: Dispatch<DraftAction>;
  readonly kind: ChartKind;
}

const ChartKindTiles = ({
  dispatch,
  kind,
}: ChartKindTilesProps): ReactElement => {
  const handleSelect = useCallback(
    (chart: ChartKind): void => dispatch({ chart, kind: "set-chart-kind" }),
    [dispatch]
  );

  return (
    <fieldset aria-label={copy.kindsLabel} className={styles.tiles}>
      {KINDS.map((option) => (
        <ChartKindTile
          id={option.id}
          isActive={option.id === kind}
          key={option.id}
          label={option.label}
          onSelect={handleSelect}
        />
      ))}
    </fieldset>
  );
};

export { ChartKindTiles };
