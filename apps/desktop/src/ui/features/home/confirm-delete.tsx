import { useCallback } from "react";
import type { ReactElement } from "react";

import { ConfirmHead } from "./confirm-head.js";
import { copy } from "./copy.js";
import { toConfirmAction, toConfirmTitle } from "./trash-model.js";
import type { Confirm } from "./trash-model.js";
import { useHomeDialog } from "./use-home-dialog.js";

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
  const dismiss = useCallback((): boolean => {
    if (isBusy) {
      return false;
    }

    onCancel();

    return true;
  }, [isBusy, onCancel]);

  const ref = useHomeDialog(dismiss);
  const title = toConfirmTitle(confirm);

  return (
    <dialog ref={ref} className="modal trash-confirm" aria-label={title}>
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

export { ConfirmDelete };

export type { ConfirmDeleteProps };
