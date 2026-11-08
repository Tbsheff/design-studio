import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ScreenPlanWire } from "./screen-model.js";

import styles from "./screen.module.css";

interface ScreenPathStatusProps {
  readonly error: Error | null;
  readonly hasPath: boolean;
  readonly isLoading: boolean;
  readonly plan: ScreenPlanWire | null;
  readonly showFile: boolean;
}

const ScreenPathStatus = ({
  error,
  hasPath,
  isLoading,
  plan,
  showFile,
}: ScreenPathStatusProps): ReactElement => {
  if (!hasPath) {
    return <p className={styles.status}>{copy.pathHint}</p>;
  }

  if (error !== null) {
    return (
      <p className={`${styles.status} ${styles.statusTaken}`}>
        {copy.planFailed}
      </p>
    );
  }

  if (isLoading || plan === null) {
    return <p className={styles.status}>{copy.checking}</p>;
  }

  if (!plan.isPathFree) {
    return (
      <p className={`${styles.status} ${styles.statusTaken}`} role="alert">
        {copy.pathTaken}
      </p>
    );
  }

  return (
    <p className={`${styles.status} ${styles.statusFree}`}>
      <span>{copy.pathFree}</span>
      {showFile && (
        <span className={`mono ${styles.statusFile}`}>{plan.filePath}</span>
      )}
    </p>
  );
};

export { ScreenPathStatus };
