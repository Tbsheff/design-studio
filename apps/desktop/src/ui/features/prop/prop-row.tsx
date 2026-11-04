import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { KIND_LABELS } from "./prop-model.js";
import type { PropRowView } from "./prop-model.js";
import { PropRowDelete } from "./prop-row-delete.js";
import { PropRowRename } from "./prop-row-rename.js";

import styles from "./prop.module.css";

interface PropRowProps {
  readonly isBusy: boolean;
  readonly onDelete: (name: string) => void;
  readonly onRename: (name: string, newName: string) => void;
  readonly row: PropRowView;
}

type RowMode = "delete" | "idle" | "rename";

const PropRow = ({
  isBusy,
  onDelete,
  onRename,
  row,
}: PropRowProps): ReactElement => {
  const [mode, setMode] = useState<RowMode>("idle");

  const handleRenameOpen = useCallback((): void => setMode("rename"), []);
  const handleDeleteOpen = useCallback((): void => setMode("delete"), []);
  const handleCancel = useCallback((): void => setMode("idle"), []);

  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.name}>{row.name}</span>
        <span className={styles.kind}>{KIND_LABELS[row.kind]}</span>
        <span className={styles.meta}>{`${row.useCount} ${copy.uses}`}</span>
      </div>
      {row.default !== null && (
        <code
          className={styles.meta}
        >{`${copy.defaultLabel}: ${row.default}`}</code>
      )}
      {mode === "idle" && row.isDeclared && (
        <div className={styles.rowActions}>
          <button
            className={styles.small}
            disabled={isBusy}
            onClick={handleRenameOpen}
            type="button"
          >
            {copy.rename}
          </button>
          <button
            className={`${styles.small} ${styles.danger}`}
            disabled={isBusy}
            onClick={handleDeleteOpen}
            type="button"
          >
            {copy.delete}
          </button>
        </div>
      )}
      {mode === "rename" && (
        <PropRowRename
          isBusy={isBusy}
          name={row.name}
          onCancel={handleCancel}
          onRename={onRename}
        />
      )}
      {mode === "delete" && (
        <PropRowDelete
          isBusy={isBusy}
          name={row.name}
          onCancel={handleCancel}
          onDelete={onDelete}
        />
      )}
    </li>
  );
};

export { PropRow };
