import type { ReactElement } from "react";

import { toCostText, toTimeText } from "./completion-model.js";
import { copy } from "./copy.js";
import type { CompletionRecordView } from "./use-completion.js";

import styles from "./completion.module.css";

interface CompletionRowProps {
  readonly item: CompletionRecordView;
}

const CompletionRow = ({ item }: CompletionRowProps): ReactElement => (
  <li className={styles.row}>
    <span className={styles.time}>{toTimeText(item.at)}</span>
    <span className={styles.prompt}>{item.promptStart}</span>
    <span className={styles.cost}>{toCostText(item.costUsd)}</span>
    <span className={styles.frame}>{item.frame ?? copy.frameNone}</span>
  </li>
);

export { CompletionRow };
