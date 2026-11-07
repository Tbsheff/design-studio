import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./integration.module.css";

interface IntegrationDeleteProps {
  readonly id: string;
  readonly isBusy: boolean;
  readonly onDelete: (id: string) => void;
}

const IntegrationDelete = ({
  id,
  isBusy,
  onDelete,
}: IntegrationDeleteProps): ReactElement => {
  const [isAsking, setIsAsking] = useState(false);
  const handleAsk = useCallback((): void => setIsAsking(true), []);
  const handleKeep = useCallback((): void => setIsAsking(false), []);
  const handleDelete = useCallback((): void => onDelete(id), [id, onDelete]);

  if (!isAsking) {
    return (
      <button
        className={`${styles.small} ${styles.danger}`}
        data-tip={copy.deleteTip}
        disabled={isBusy}
        onClick={handleAsk}
        type="button"
      >
        {copy.delete}
      </button>
    );
  }

  return (
    <span className={styles.actions}>
      <span className={styles.note}>{copy.deleteAsk}</span>
      <button
        className={`${styles.small} ${styles.danger}`}
        disabled={isBusy}
        onClick={handleDelete}
        type="button"
      >
        {copy.deleteConfirm}
      </button>
      <button className={styles.small} onClick={handleKeep} type="button">
        {copy.cancel}
      </button>
    </span>
  );
};

export { IntegrationDelete };
