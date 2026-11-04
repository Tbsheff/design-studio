import type { ReactElement } from "react";

import styles from "./state-styles.module.css";

interface StateDotProps {
  readonly isShown: boolean;
}

const StateDot = ({ isShown }: StateDotProps): ReactElement | null => {
  if (!isShown) {
    return null;
  }

  return <span aria-hidden="true" className={styles.dot} />;
};

export { StateDot };
