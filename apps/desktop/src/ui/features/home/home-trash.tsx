import { useModalDialog } from "@design-studio/ui";
import { useRef } from "react";
import type { ReactElement } from "react";

import { ConfirmHead } from "./confirm-head.js";
import { copy } from "./copy.js";
import { TrashBody } from "./trash-body.js";
import { TrashFoot } from "./trash-foot.js";
import { TrashHead } from "./trash-head.js";
import { toConfirmAction, toConfirmTitle } from "./trash-model.js";
import type { Confirm } from "./trash-model.js";
import { useTrashActions } from "./use-trash-actions.js";
import { useTrashList } from "./use-trash-list.js";

interface ConfirmDeleteProps {
  readonly confirm: Confirm;
  readonly isBusy: boolean;
  readonly error: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

const ConfirmDelete = ({
  confirm,
  isBusy,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteProps): ReactElement => {
  const dialog = useModalDialog(() => {
    if (isBusy) {
      return false;
    }

    return onCancel();
  });

  const title = toConfirmTitle(confirm);

  return (
    <dialog
      ref={dialog.ref}
      className="modal trash-confirm"
      aria-label={title}
      onMouseDown={dialog.onMouseDown}
    >
      <ConfirmHead confirm={confirm} title={title} />
      {error && (
        <div className="modal-body">
          <div className="alert error small" role="alert">
            {error}
          </div>
        </div>
      )}
      <div className="modal-foot">
        <button
          type="button"
          className="btn ghost"
          data-autofocus
          onClick={onCancel}
          disabled={isBusy}
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          className="btn danger"
          onClick={onConfirm}
          disabled={isBusy}
        >
          {toConfirmAction(confirm, isBusy)}
        </button>
      </div>
    </dialog>
  );
};

interface HomeTrashProps {
  readonly onClose: () => void;
  readonly onRestored: () => void;
}

const HomeTrash = ({ onClose, onRestored }: HomeTrashProps): ReactElement => {
  const firstRestoreRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const list = useTrashList();

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

  const dialog = useModalDialog(() => {
    if (confirm) {
      return false;
    }

    return onClose();
  });

  return (
    <dialog
      ref={dialog.ref}
      className="modal trash-modal"
      aria-labelledby="trash-title"
      onMouseDown={dialog.onMouseDown}
    >
      <TrashHead onClose={onClose} />
      <TrashBody
        items={list.items}
        error={list.message}
        note={note}
        isBusy={busy !== null}
        firstRestoreRef={firstRestoreRef}
        onRetry={list.reload}
        onRestore={restore}
        onDelete={askOne}
      />
      <TrashFoot
        items={list.items}
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
