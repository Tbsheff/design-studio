import type { TrashItem } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { toTrashCountText } from "./trash-model.js";

interface TrashFootProps {
  readonly items: readonly TrashItem[] | null;
  readonly isBusy: boolean;
  readonly doneRef: RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
  readonly onEmpty: (count: number, shouldFolderStay: boolean) => void;
}

const TrashFoot = ({
  items,
  isBusy,
  doneRef,
  onClose,
  onEmpty,
}: TrashFootProps): ReactElement => {
  const count = items?.length ?? 0;

  const empty = useCallback((): void => {
    onEmpty(
      count,
      (items ?? []).every((item) => item.folderStays)
    );
  }, [count, items, onEmpty]);

  return (
    <div className="modal-foot">
      <span className="hint trash-count">{toTrashCountText(items)}</span>
      {count > 0 && (
        <button
          type="button"
          className="btn danger"
          disabled={isBusy}
          onClick={empty}
        >
          {copy.emptyTrash}
        </button>
      )}
      <button ref={doneRef} type="button" className="btn" onClick={onClose}>
        {copy.done}
      </button>
    </div>
  );
};

export { TrashFoot };
