import type { ReactElement } from "react";

import type { FixRowView } from "./fix-model.js";

import styles from "./viewport.module.css";

interface FixRowProps {
  readonly row: FixRowView;
}

const FixRow = ({ row }: FixRowProps): ReactElement => (
  <li className={styles.row}>
    <div className={styles.fixLine} data-skipped={row.isSkipped}>
      <span className={styles.cell}>{row.width}</span>
      <span className={styles.kind}>{row.kind}</span>
      <span className={styles.detail}>{row.detail}</span>
    </div>
  </li>
);

export { FixRow };
