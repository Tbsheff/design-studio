import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./pattern.module.css";

interface PatternDeleteControlsProps {
  readonly isBusy: boolean;
  readonly onDelete: (patternId: string) => void;
  readonly patternId: string;
}

const PatternDeleteControls = ({
  isBusy,
  onDelete,
  patternId,
}: PatternDeleteControlsProps): ReactElement => {
  const [isAsking, setIsAsking] = useState(false);

  const handleAsk = useCallback((): void => setIsAsking(true), []);
  const handleKeep = useCallback((): void => setIsAsking(false), []);

  const handleDelete = useCallback(
    (): void => onDelete(patternId),
    [onDelete, patternId]
  );

  if (!isAsking) {
    return (
      <div className={styles.actions}>
        <button
          className={`${styles.small} ${styles.danger}`}
          data-tip={copy.deleteTip}
          disabled={isBusy}
          onClick={handleAsk}
          type="button"
        >
          {copy.delete}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.actions}>
      <span className={styles.note}>{copy.deleteAsk}</span>
      <button
        className={`${styles.small} ${styles.danger}`}
        disabled={isBusy}
        onClick={handleDelete}
        type="button"
      >
        {copy.confirmDelete}
      </button>
      <button className={styles.small} onClick={handleKeep} type="button">
        {copy.cancel}
      </button>
    </div>
  );
};

export { PatternDeleteControls };
