import type { ReactElement } from "react";

import styles from "./effect.module.css";

interface EffectNoteProps {
  readonly isError: boolean;
  readonly text: string | null;
}

const EffectNote = ({
  isError,
  text,
}: EffectNoteProps): ReactElement | null => {
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

export { EffectNote };
