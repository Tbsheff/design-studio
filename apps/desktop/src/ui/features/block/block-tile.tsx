import { useCallback } from "react";
import type { ReactElement } from "react";

import type { BlockItem } from "./block-model.js";
import { BlockWireframe } from "./block-wireframe.js";
import { copy } from "./copy.js";

import styles from "./block.module.css";

interface BlockTileProps {
  readonly block: BlockItem;
  readonly isBusy: boolean;
  readonly onInsert: (blockId: string) => void;
  readonly tip: string;
}

const BlockTile = ({
  block,
  isBusy,
  onInsert,
  tip,
}: BlockTileProps): ReactElement => {
  const handleInsert = useCallback(
    (): void => onInsert(block.id),
    [block.id, onInsert]
  );

  const missingTip = `${copy.missingTip} ${block.missing.join(", ")}`;

  return (
    <li className={styles.tile} data-block={block.id}>
      <BlockWireframe kind={block.kind} />
      <div className={styles.meta}>
        <span className={styles.name}>{block.name}</span>
        <span className={styles.description}>{block.description}</span>
        {block.missing.length > 0 && (
          <span className={styles.missing} data-tip={missingTip}>
            {copy.missingLabel} {block.missing.length} {copy.missingCount}
          </span>
        )}
        {block.missing.length === 0 && (
          <span className={styles.matched}>{copy.matched}</span>
        )}
      </div>
      <button
        className={styles.primary}
        data-tip={tip}
        disabled={isBusy}
        onClick={handleInsert}
        type="button"
      >
        {copy.insert}
      </button>
    </li>
  );
};

export { BlockTile };
