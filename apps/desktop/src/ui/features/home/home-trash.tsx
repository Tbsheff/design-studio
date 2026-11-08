import { useCallback, useRef } from "react";
import type { ReactElement } from "react";

import { ConfirmDelete } from "./confirm-delete.js";
import { TrashBody } from "./trash-body.js";
import { TrashFoot } from "./trash-foot.js";
import { TrashHead } from "./trash-head.js";
import { useHomeDialog } from "./use-home-dialog.js";
import { useTrashActions } from "./use-trash-actions.js";
import { useTrashList } from "./use-trash-list.js";

interface HomeTrashProps {
  readonly onClose: () => void;
  readonly onRestored: () => void;
}

const HomeTrash = ({ onClose, onRestored }: HomeTrashProps): ReactElement => {
  const firstRestoreRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const list = useTrashList();
  const { items, message, reload } = list;

  const {
    busy,
    confirm,
    confirmError,
    note,
    restore,
    askOne,
    askAll,
    cancelConfirm,
    confirmDelete,
  } = useTrashActions({ doneRef, firstRestoreRef, list, onRestored });

  const dismiss = useCallback((): boolean => {
    if (confirm) {
      return false;
    }

    onClose();

    return true;
  }, [confirm, onClose]);

  const ref = useHomeDialog(dismiss);

  return (
    <dialog
      ref={ref}
      className="modal trash-modal"
      aria-labelledby="trash-title"
    >
      <TrashHead onClose={onClose} />
      <TrashBody
        items={items}
        error={message}
        note={note}
        isBusy={busy !== null}
        firstRestoreRef={firstRestoreRef}
        onRetry={reload}
        onRestore={restore}
        onDelete={askOne}
      />
      <TrashFoot
        items={items}
        isBusy={busy !== null}
        doneRef={doneRef}
        onClose={onClose}
        onEmpty={askAll}
      />
      {confirm && (
        <ConfirmDelete
          confirm={confirm}
          isBusy={busy === "confirm"}
          error={confirmError}
          onCancel={cancelConfirm}
          onConfirm={confirmDelete}
        />
      )}
    </dialog>
  );
};

export { HomeTrash };

export type { HomeTrashProps };
