import type { ReactElement } from "react";

import styles from "./state-styles.module.css";

interface StateNoteProps {
  readonly isError: boolean;
  readonly text: string | null;
}

const classOf = (isError: boolean): string | undefined => {
  if (isError) {
    return styles.error;
  }

  return styles.note;
};

const StateNote = ({ isError, text }: StateNoteProps): ReactElement | null => {
  if (text === null) {
    return null;
  }

  return (
    <p aria-live="polite" className={classOf(isError)}>
      {text}
    </p>
  );
};

export { StateNote };
