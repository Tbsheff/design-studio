import { useCallback } from "react";
import type { ReactElement } from "react";

import { BlockMissingList } from "./block-missing-list.js";
import type { BlockItem } from "./block-model.js";
import { BlockWireframe } from "./block-wireframe.js";
import { copy } from "./copy.js";

import styles from "./block.module.css";

interface BlockTileProps {
  readonly block: BlockItem;
  readonly isBusy: boolean;
  readonly onAdd: (name: string) => void;
  readonly onInsert: (blockId: string) => void;
  readonly tip: string;
}

const BlockTile = ({
  block,
  isBusy,
  onAdd,
  onInsert,
  tip,
}: BlockTileProps): ReactElement => {
  const handleInsert = useCallback(
    (): void => onInsert(block.id),
    [block.id, onInsert]
  );

  return (
    <li className={styles.tile} data-block={block.id}>
      <BlockWireframe kind={block.kind} />
      <div className={styles.meta}>
        <span className={styles.name}>{block.name}</span>
        <span className={styles.description}>{block.description}</span>
        {block.missing.length > 0 && (
          <BlockMissingList
            isBusy={isBusy}
            names={block.missing}
            onAdd={onAdd}
          />
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
