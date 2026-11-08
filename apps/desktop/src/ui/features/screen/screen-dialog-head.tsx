import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./screen.module.css";

interface ScreenDialogHeadProps {
  readonly onClose: () => void;
  readonly title: string;
}

const ScreenDialogHead = ({
  onClose,
  title,
}: ScreenDialogHeadProps): ReactElement => (
  <header className={styles.head}>
    <h2 className={styles.title}>{title}</h2>
    <button
      className={`btn ghost ${styles.close}`}
      onClick={onClose}
      type="button"
    >
      {copy.close}
    </button>
  </header>
);

export { ScreenDialogHead };
