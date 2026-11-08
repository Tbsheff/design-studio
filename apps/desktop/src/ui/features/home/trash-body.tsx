import type { TrashItem } from "@design-studio/contracts";
import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { TrashEmptyNote } from "./trash-empty-note.js";
import { TrashList } from "./trash-list.js";

interface TrashBodyProps {
  readonly items: readonly TrashItem[] | null;
  readonly error: string | null;
  readonly note: string;
  readonly isBusy: boolean;
  readonly firstRestoreRef: RefObject<HTMLButtonElement | null>;
  readonly onRetry: () => void;
  readonly onRestore: (item: TrashItem) => void;
  readonly onDelete: (item: TrashItem) => void;
}

const TrashBody = ({
  items,
  error,
  note,
  isBusy,
  firstRestoreRef,
  onRetry,
  onRestore,
  onDelete,
}: TrashBodyProps): ReactElement => (
  <div className="modal-body trash-body">
    {error && (
      <div className="alert error small trash-error" role="alert">
        <span>{error}</span>
        <button type="button" className="btn small" onClick={onRetry}>
          {copy.retry}
        </button>
      </div>
    )}
    {items !== null && items.length === 0 && <TrashEmptyNote />}
    {items !== null && items.length > 0 && (
      <TrashList
        items={items}
        isBusy={isBusy}
        firstRestoreRef={firstRestoreRef}
        onRestore={onRestore}
        onDelete={onDelete}
      />
    )}
    <output className="sr-only">{note}</output>
  </div>
);

export { TrashBody };
