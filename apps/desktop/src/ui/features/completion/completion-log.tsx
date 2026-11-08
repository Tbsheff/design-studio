import type { ReactElement } from "react";

import { CompletionRow } from "./completion-row.js";
import { copy } from "./copy.js";
import type { CompletionRecordView } from "./use-completion.js";

import styles from "./completion.module.css";

interface CompletionLogProps {
  readonly records: readonly CompletionRecordView[];
}

const CompletionLog = ({ records }: CompletionLogProps): ReactElement => {
  if (records.length === 0) {
    return <p className={styles.note}>{copy.empty}</p>;
  }

  return (
    <ul className={styles.log}>
      {records.map((item) => (
        <CompletionRow key={item.id} item={item} />
      ))}
    </ul>
  );
};

export { CompletionLog };
