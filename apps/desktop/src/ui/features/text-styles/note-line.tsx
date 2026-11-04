import type { ReactElement } from "react";

import type { Note } from "./style-edits.js";

import styles from "./text-styles.module.css";

interface NoteLineProps {
  readonly note: Note | null;
}

const NoteLine = ({ note }: NoteLineProps): ReactElement | null => {
  if (!note) {
    return null;
  }

  if (note.kind === "error") {
    return (
      <p className={styles.error} role="alert">
        {note.text}
      </p>
    );
  }

  return <output className={styles.note}>{note.text}</output>;
};

export { NoteLine };
