import type { ReactElement } from "react";

import styles from "./screen.module.css";

interface ScreenErrorLineProps {
  readonly error: Error | null;
}

const ScreenErrorLine = ({
  error,
}: ScreenErrorLineProps): ReactElement | null => {
  if (error === null) {
    return null;
  }

  return (
    <p className={styles.error} role="alert">
      {error.message}
    </p>
  );
};

export { ScreenErrorLine };
