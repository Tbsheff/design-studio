import type { ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { copy } from "./copy.js";
import { toAreaText } from "./port-check-model.js";
import type { RunView } from "./run-state-model.js";
import { usePortCheck } from "./use-port-check.js";

import styles from "./port-check-row.module.css";

const PortCheckRow = ({
  run,
}: {
  readonly run: RunView;
}): ReactElement | null => {
  const { error, isChecking, isPending, match, onFix } = usePortCheck(run);

  if (isChecking) {
    return (
      <div className={styles.row} data-testid="port-check-row">
        <span className={styles.label}>{copy.portCheckChecking}</span>
      </div>
    );
  }

  if (match === null) {
    if (error === null) {
      return null;
    }

    return (
      <div className={styles.row} data-testid="port-check-row">
        <span className={styles.error} role="alert">
          {error}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(styles.row, match.isLow && styles.low)}
      aria-busy={isPending}
      data-testid="port-check-row"
    >
      <span className={styles.score}>
        {copy.portCheckMatches}
        {match.score}
        {copy.portCheckPercent}
      </span>
      <span className={styles.label}>{toAreaText(match.areas.length)}</span>
      {match.isLow && (
        <button
          type="button"
          className="btn small"
          disabled={isPending}
          onClick={onFix}
        >
          {copy.portCheckFix}
        </button>
      )}
    </div>
  );
};

export { PortCheckRow };
