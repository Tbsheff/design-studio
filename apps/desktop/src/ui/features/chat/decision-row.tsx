import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DecisionRowChip } from "./decision-row-chip.js";
import type { RunView } from "./run-state-model.js";
import { useDecisionRow } from "./use-decision-row.js";

import styles from "./decision-row.module.css";

const DecisionRow = ({
  run,
}: {
  readonly run: RunView;
}): ReactElement | null => {
  const { decisions, error, isPending, onPick } = useDecisionRow(run);

  if (decisions.length === 0) {
    return null;
  }

  return (
    <fieldset
      className={styles.row}
      aria-label={copy.decisionRowLabel}
      aria-busy={isPending}
      data-testid="decision-row"
    >
      <span className={styles.label}>{copy.decisionChose}</span>
      {decisions.map((decision) => (
        <DecisionRowChip
          key={decision.id}
          decision={decision}
          isPending={isPending}
          onPick={onPick}
        />
      ))}
      {error !== null && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
};

export { DecisionRow };
