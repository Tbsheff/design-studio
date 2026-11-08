import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toCountText, toFixRows } from "./fix-model.js";
import type { FixResultView } from "./fix-model.js";
import { FixRow } from "./fix-row.js";

import styles from "./viewport.module.css";

interface FixListProps {
  readonly isSaved: boolean;
  readonly result: FixResultView;
}

const FixList = ({ isSaved, result }: FixListProps): ReactElement => {
  const rows = toFixRows(result);

  return (
    <>
      <span className={styles.label}>
        {copy.fix.edits} {toCountText(result)}
      </span>
      {rows.length === 0 && (
        <span className={styles.clean}>{copy.fix.empty}</span>
      )}
      <ul aria-label={copy.fix.edits} className={styles.list}>
        {rows.map((row) => (
          <FixRow key={row.key} row={row} />
        ))}
      </ul>
      {isSaved && <span className={styles.clean}>{copy.fix.applied}</span>}
    </>
  );
};

export { FixList };
