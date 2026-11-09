import type { ReactElement } from "react";

import { BlockMissingRow } from "./block-missing-row.js";
import { toMissingRoots } from "./block-model.js";
import { copy } from "./copy.js";

import styles from "./block.module.css";

interface BlockMissingListProps {
  readonly isBusy: boolean;
  readonly names: readonly string[];
  readonly onAdd: (name: string) => void;
}

const BlockMissingList = ({
  isBusy,
  names,
  onAdd,
}: BlockMissingListProps): ReactElement => (
  <div className={styles.missing} data-tip={copy.missingTip}>
    <span>{copy.missingLabel}</span>
    <ul aria-label={copy.missingListLabel} className={styles.missingList}>
      {toMissingRoots(names).map((name) => (
        <BlockMissingRow isBusy={isBusy} key={name} name={name} onAdd={onAdd} />
      ))}
    </ul>
  </div>
);

export { BlockMissingList };
