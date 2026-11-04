import type { ReactElement } from "react";

import type { MotionNote } from "./use-motion.js";

import styles from "./motion.module.css";

interface NoteLineProps {
  readonly note: MotionNote | null;
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

  return <output className={styles.ok}>{note.text}</output>;
};

export { NoteLine };
