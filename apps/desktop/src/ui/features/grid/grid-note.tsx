import type { ReactElement } from "react";

import styles from "./grid.module.css";

interface GridNoteProps {
  readonly isError: boolean;
  readonly text: string | null;
}

const GridNote = ({ isError, text }: GridNoteProps): ReactElement | null => {
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

export { GridNote };
