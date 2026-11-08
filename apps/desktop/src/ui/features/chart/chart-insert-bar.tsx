import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ChartInsert } from "./use-chart-insert.js";
import type { Inspected } from "./use-chart-inspect.js";

import styles from "./chart.module.css";

interface ChartInsertBarProps {
  readonly hasLayer: boolean;
  readonly insert: ChartInsert;
  readonly inspected: Inspected | null;
}

const MODE_TEXT = {
  kit: copy.modeKit,
  recharts: copy.modeRecharts,
  svg: copy.modeSvg,
} as const;

const ChartInsertBar = ({
  hasLayer,
  insert,
  inspected,
}: ChartInsertBarProps): ReactElement => {
  let tip: string = copy.insertTip;

  if (!hasLayer) {
    tip = copy.insertNeedsLayer;
  }

  return (
    <div className={styles.form}>
      {inspected !== null && (
        <p className={styles.note}>
          {copy.drawsWith} {MODE_TEXT[inspected.mode]}
        </p>
      )}
      <div className={styles.actions}>
        <button
          className={styles.primary}
          data-tip={tip}
          disabled={insert.isBusy || !hasLayer || !insert.isReady}
          onClick={insert.handleInsert}
          type="button"
        >
          {copy.insert}
        </button>
      </div>
      {insert.error !== null && <p className={styles.error}>{insert.error}</p>}
      {insert.result !== null && insert.error === null && (
        <p className={styles.note}>
          {copy.inserted} {insert.result.file}
        </p>
      )}
    </div>
  );
};

export { ChartInsertBar };
