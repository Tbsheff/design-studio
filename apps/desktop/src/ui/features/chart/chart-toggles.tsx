import { useCallback } from "react";
import type { ChangeEvent, Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import type { ChartDraft } from "./chart-model.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartTogglesProps {
  readonly dispatch: Dispatch<DraftAction>;
  readonly draft: ChartDraft;
}

const ChartToggles = ({ dispatch, draft }: ChartTogglesProps): ReactElement => {
  const handleStacked = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      dispatch({ isOn: event.target.checked, kind: "set-stacked" }),
    [dispatch]
  );

  const handleLegend = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      dispatch({ isOn: event.target.checked, kind: "set-legend" }),
    [dispatch]
  );

  const canStack =
    draft.series.length > 1 && (draft.kind === "bar" || draft.kind === "area");

  return (
    <>
      <label className={styles.check}>
        <input
          checked={draft.hasLegend}
          onChange={handleLegend}
          type="checkbox"
        />
        {copy.legendLabel}
      </label>
      <label className={styles.check}>
        <input
          checked={draft.isStacked}
          disabled={!canStack}
          onChange={handleStacked}
          type="checkbox"
        />
        {copy.stackedLabel}
      </label>
    </>
  );
};

export { ChartToggles };
