import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useModalDialog } from "./deps.js";
import type { DevNote } from "./dev-note-model.js";
import { DevNoteRow } from "./dev-note-row.js";
import { useListDevNote } from "./use-list-dev-note.js";

import styles from "./dev-note.module.css";

interface DevNoteListDialogProps {
  readonly frameId: string;
  readonly frameName: string;
  readonly onClose: () => void;
  readonly onSelect: (note: DevNote) => void;
  readonly projectId: string;
}

const NO_NOTES: never[] = [];

const DevNoteListDialog = ({
  frameId,
  frameName,
  onClose,
  onSelect,
  projectId,
}: DevNoteListDialogProps): ReactElement => {
  const list = useListDevNote(projectId, frameId);

  const dismissDialog = useCallback((): boolean => {
    onClose();

    return true;
  }, [onClose]);

  const { ref } = useModalDialog(dismissDialog);

  const notes = list.data?.items ?? NO_NOTES;

  return (
    <dialog
      aria-label={copy.listTitle}
      className={`modal ${styles.dialog}`}
      ref={ref}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>{copy.listTitle}</h2>
        <span className={styles.target}>{frameName}</span>
        <button className={styles.small} onClick={onClose} type="button">
          {copy.cancel}
        </button>
      </header>
      {list.error && <p className="ui-error">{copy.failed}</p>}
      {list.loading && <p className="ui-muted">{copy.listLoading}</p>}
      {!list.loading && notes.length === 0 && (
        <p className="ui-muted">{copy.listEmpty}</p>
      )}
      <ul className={`ui-menu ${styles.list}`}>
        {notes.map((note) => (
          <DevNoteRow key={note.id} note={note} onSelect={onSelect} />
        ))}
      </ul>
    </dialog>
  );
};

export { DevNoteListDialog };

export type { DevNoteListDialogProps };
