import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toKindLabel } from "./dev-note-model.js";
import type { DevNote } from "./dev-note-model.js";

import styles from "./dev-note.module.css";

interface DevNoteRowProps {
  readonly note: DevNote;
  readonly onSelect: (note: DevNote) => void;
}

const DevNoteRow = ({ note, onSelect }: DevNoteRowProps): ReactElement => {
  const select = useCallback(() => onSelect(note), [note, onSelect]);

  return (
    <li>
      <button
        className={`ui-menu-item ${styles.row}`}
        data-tip={copy.rowTip}
        onClick={select}
        type="button"
      >
        <span className={styles.number}>{note.number}</span>
        <span className={styles.kind}>{toKindLabel(note.kind)}</span>
        <span className={styles.noteText}>{note.text}</span>
        <span className={styles.source}>{note.source ?? copy.noSource}</span>
      </button>
    </li>
  );
};

export { DevNoteRow };

export type { DevNoteRowProps };
