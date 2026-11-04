import type { ReactElement } from "react";

import type { FillNote } from "./use-fill.js";

import styles from "./fill.module.css";

interface FillNoteLineProps {
  readonly note: FillNote | null;
}

const FillNoteLine = ({ note }: FillNoteLineProps): ReactElement | null => {
  if (!note) {
    return null;
  }

  return (
    <p aria-live="polite" className={styles[note.kind]}>
      {note.text}
    </p>
  );
};

export { FillNoteLine };
