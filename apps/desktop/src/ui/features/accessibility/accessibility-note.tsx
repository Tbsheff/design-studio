import type { ReactElement } from "react";

import styles from "./accessibility.module.css";

interface AccessibilityNoteProps {
  readonly isError: boolean;
  readonly text: string | null;
}

const AccessibilityNote = ({
  isError,
  text,
}: AccessibilityNoteProps): ReactElement | null => {
  if (text === null) {
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

export { AccessibilityNote };

export type { AccessibilityNoteProps };
