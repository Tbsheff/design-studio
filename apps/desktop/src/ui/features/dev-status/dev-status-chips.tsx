import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { DevStatusEntry } from "./dev-status-types.js";

import styles from "./dev-status.module.css";

interface RowEntryProps {
  readonly entry: DevStatusEntry | null;
}

const ChangedChip = ({ entry }: RowEntryProps): ReactElement | null => {
  if (entry === null || entry.status !== "ready" || !entry.isChangedSince) {
    return null;
  }

  return (
    <span
      className={styles.chip}
      data-tip={`${copy.changedTip} ${entry.changedFiles.join(", ")}`}
    >
      {copy.changedChip}
    </span>
  );
};

export { ChangedChip };

export type { RowEntryProps };
