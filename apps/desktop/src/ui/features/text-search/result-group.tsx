import type { ReactElement } from "react";

import type { TextHit } from "./deps.js";
import { ResultRow } from "./result-row.js";
import type { HitGroup } from "./text-search-model.js";

import styles from "./text-search.module.css";

interface ResultGroupProps {
  readonly activeId: string | null;
  readonly frameName: string | null;
  readonly group: HitGroup;
  readonly isBusy: boolean;
  readonly onPick: (hit: TextHit) => void;
  readonly onReplace: (hit: TextHit) => void;
}

const ResultGroup = ({
  activeId,
  frameName,
  group,
  isBusy,
  onPick,
  onReplace,
}: ResultGroupProps): ReactElement => (
  <li className={styles.group}>
    <div className={styles.groupHead}>
      {frameName !== null && <span className={styles.frame}>{frameName}</span>}
      <span className={styles.file}>{group.file}</span>
      <span className={styles.count}>{group.hits.length}</span>
    </div>
    <ul className={styles.rows}>
      {group.hits.map((hit) => (
        <ResultRow
          key={hit.id}
          hit={hit}
          isActive={hit.id === activeId}
          isBusy={isBusy}
          onPick={onPick}
          onReplace={onReplace}
        />
      ))}
    </ul>
  </li>
);

export { ResultGroup };
