import { useCallback } from "react";
import type { ChangeEvent, Dispatch, ReactElement } from "react";

import type { DraftAction } from "./chart-draft-model.js";
import type { ChartDraft } from "./chart-model.js";
import { ChartPlaceSelect } from "./chart-place-select.js";
import { ChartToggles } from "./chart-toggles.js";
import { copy } from "./copy.js";

import styles from "./chart.module.css";

interface ChartOptionsProps {
  readonly dispatch: Dispatch<DraftAction>;
  readonly draft: ChartDraft;
}

const ChartOptions = ({ dispatch, draft }: ChartOptionsProps): ReactElement => {
  const handleTitle = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      dispatch({ kind: "set-title", text: event.target.value }),
    [dispatch]
  );

  return (
    <div className={styles.form}>
      <input
        aria-label={copy.chartTitle}
        className={styles.input}
        onChange={handleTitle}
        placeholder={copy.titlePlaceholder}
        value={draft.title}
      />
      <div className={styles.actions}>
        <ChartToggles dispatch={dispatch} draft={draft} />
        <ChartPlaceSelect dispatch={dispatch} position={draft.position} />
      </div>
    </div>
  );
};

export { ChartOptions };
