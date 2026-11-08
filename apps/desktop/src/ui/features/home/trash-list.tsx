import type { TrashItem } from "@design-studio/contracts";
import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { TrashRow } from "./trash-row.js";

interface TrashListProps {
  readonly items: readonly TrashItem[];
  readonly isBusy: boolean;
  readonly firstRestoreRef: RefObject<HTMLButtonElement | null>;
  readonly onRestore: (item: TrashItem) => void;
  readonly onDelete: (item: TrashItem) => void;
}

const toRestoreRef = (
  index: number,
  firstRestoreRef: RefObject<HTMLButtonElement | null>
): RefObject<HTMLButtonElement | null> | null => {
  if (index === 0) {
    return firstRestoreRef;
  }

  return null;
};

const TrashList = ({
  items,
  isBusy,
  firstRestoreRef,
  onRestore,
  onDelete,
}: TrashListProps): ReactElement => (
  <ul className="trash-list" aria-label={copy.deletedProjects}>
    {items.map((item, index) => (
      <TrashRow
        key={item.trashId}
        item={item}
        isBusy={isBusy}
        restoreRef={toRestoreRef(index, firstRestoreRef)}
        onRestore={onRestore}
        onDelete={onDelete}
      />
    ))}
  </ul>
);

export { TrashList };
