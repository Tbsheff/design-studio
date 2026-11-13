import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { EditAppConfirmHead } from "./edit-app-confirm-head.js";
import { useHomeDialog } from "./use-home-dialog.js";

interface EditAppConfirmDialogProps {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly path: string;
}

const EditAppConfirmDialog = ({
  onCancel,
  onConfirm,
  path,
}: EditAppConfirmDialogProps): ReactElement => {
  const dismiss = useCallback((): boolean => {
    onCancel();

    return true;
  }, [onCancel]);

  const ref = useHomeDialog(dismiss);

  return (
    <dialog
      ref={ref}
      className="modal trash-confirm"
      aria-label={copy.editAppConfirmTitle}
    >
      <EditAppConfirmHead path={path} />
      <div className="modal-foot">
        <button
          type="button"
          className="btn ghost"
          data-autofocus
          onClick={onCancel}
        >
          {copy.cancel}
        </button>
        <button type="button" className="btn primary" onClick={onConfirm}>
          {copy.editAppConfirmAction}
        </button>
      </div>
    </dialog>
  );
};

export { EditAppConfirmDialog };

export type { EditAppConfirmDialogProps };
