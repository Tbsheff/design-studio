import type { ReactElement } from "react";

import { copy } from "./copy.js";

import styles from "./screen.module.css";

interface ScreenSourceLineProps {
  readonly from: string;
}

const ScreenSourceLine = ({ from }: ScreenSourceLineProps): ReactElement => (
  <p className={styles.status}>
    <span>{copy.copySource}</span>
    <span className="mono">{from || copy.rootRoute}</span>
  </p>
);

export { ScreenSourceLine };
