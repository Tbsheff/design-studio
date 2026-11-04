import type { ReactElement } from "react";

import styles from "./stacking.module.css";

interface StackingNoteProps {
  readonly isError: boolean;
  readonly text: string | null;
}

const StackingNote = ({
  isError,
  text,
}: StackingNoteProps): ReactElement | null => {
  if (text === null || text === "") {
    return null;
  }

  if (isError) {
    return (
      <p className={styles.error} role="alert">
        {text}
      </p>
    );
  }

  return <p className={styles.note}>{text}</p>;
};

export { StackingNote };
