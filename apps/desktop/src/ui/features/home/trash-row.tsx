import type { TrashItem } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement, Ref } from "react";

import { TrashRowActions } from "./trash-row-actions.js";
import { TrashRowText } from "./trash-row-text.js";
import { TrashThumb } from "./trash-thumb.js";

interface TrashRowProps {
  readonly item: TrashItem;
  readonly isBusy: boolean;
  readonly restoreRef: Ref<HTMLButtonElement> | null;
  readonly onRestore: (item: TrashItem) => void;
  readonly onDelete: (item: TrashItem) => void;
}

const TrashRow = ({
  item,
  isBusy,
  restoreRef,
  onRestore,
  onDelete,
}: TrashRowProps): ReactElement => {
  const restore = useCallback((): void => {
    onRestore(item);
  }, [item, onRestore]);

  const askDelete = useCallback((): void => {
    onDelete(item);
  }, [item, onDelete]);

  return (
    <li className="trash-row" data-trash-id={item.trashId}>
      <TrashThumb item={item} />
      <TrashRowText item={item} />
      <TrashRowActions
        item={item}
        isBusy={isBusy}
        restoreRef={restoreRef}
        onRestore={restore}
        onDelete={askDelete}
      />
    </li>
  );
};

export { TrashRow };
