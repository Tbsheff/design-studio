import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { BlockKindChips } from "./block-kind-chips.js";
import type { KindFilter } from "./block-model.js";
import { BlockTile } from "./block-tile.js";
import { copy } from "./copy.js";
import type { ProjectKind, SelectionContext } from "./deps.js";
import { useBlockInsert } from "./use-block-insert.js";
import { useBlockList } from "./use-block-list.js";

import styles from "./block.module.css";

interface BlockPanelProps {
  readonly directionId: string | null;
  readonly kind: ProjectKind | undefined;
  readonly projectId: string;
  readonly selection: readonly SelectionContext[] | undefined;
}

const toSelectionSource = (
  selection: SelectionContext | null
): string | null => {
  if (selection === null || selection.source === null) {
    return null;
  }

  const { col, file, line } = selection.source;

  return `${file}:${line}:${col}`;
};

const BlockPanel = ({
  directionId,
  projectId,
  selection,
}: BlockPanelProps): ReactElement => {
  const [filter, setFilter] = useState<KindFilter>(null);
  const list = useBlockList(projectId, filter);
  const first = selection?.[0] ?? null;
  const selectionSource = useMemo(() => toSelectionSource(first), [first]);

  const insert = useBlockInsert({ directionId, projectId, selectionSource });

  const handleFilter = useCallback(
    (next: KindFilter): void => setFilter(next),
    []
  );

  let tip: string = copy.insertMainTip;

  if (selectionSource !== null) {
    tip = copy.insertAfterTip;
  }

  return (
    <div className={styles.panel}>
      <BlockKindChips kind={filter} onSelect={handleFilter} />
      <ul aria-label={copy.listLabel} className={styles.list}>
        {list.items.map((block) => (
          <BlockTile
            block={block}
            isBusy={insert.isBusy}
            key={block.id}
            onInsert={insert.handleInsert}
            tip={tip}
          />
        ))}
      </ul>
      {list.items.length === 0 && list.error === null && (
        <p className={styles.note}>{copy.emptyList}</p>
      )}
      {list.error !== null && <p className={styles.error}>{copy.listFailed}</p>}
      {insert.error !== null && <p className={styles.error}>{insert.error}</p>}
      {insert.result !== null && insert.error === null && (
        <p className={styles.note}>{copy.inserted}</p>
      )}
    </div>
  );
};

export { BlockPanel };

export type { BlockPanelProps };
