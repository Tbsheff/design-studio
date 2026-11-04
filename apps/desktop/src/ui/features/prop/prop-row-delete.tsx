import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./prop.module.css";

interface PropRowDeleteProps {
  readonly isBusy: boolean;
  readonly name: string;
  readonly onCancel: () => void;
  readonly onDelete: (name: string) => void;
}

const PropRowDelete = ({
  isBusy,
  name,
  onCancel,
  onDelete,
}: PropRowDeleteProps): ReactElement => {
  const handleConfirm = useCallback((): void => {
    onDelete(name);
    onCancel();
  }, [name, onCancel, onDelete]);

  return (
    <div className={styles.rowActions}>
      <span className={styles.note}>{copy.deleteAsk}</span>
      <button
        className={`${styles.small} ${styles.danger}`}
        disabled={isBusy}
        onClick={handleConfirm}
        type="button"
      >
        {copy.confirmDelete}
      </button>
      <button className={styles.small} onClick={onCancel} type="button">
        {copy.cancel}
      </button>
    </div>
  );
};

export { PropRowDelete };
