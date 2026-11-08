import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { COPY } from "./copy.js";
import { PackDialogShell } from "./library-dialogs.js";
import { PackDialogError } from "./pack-dialog-error.js";
import { PackDialogHead } from "./pack-dialog-head.js";
import { useBusyAction } from "./use-busy-action.js";

const toDeleteLabel = (isBusy: boolean): string => {
  if (isBusy) {
    return "Deleting…";
  }

  return "Delete";
};

const DeletePackDialog = ({
  onClose,
  onDelete,
  pack,
}: {
  onClose: () => void;
  onDelete: () => Promise<void>;
  pack: PackSummary;
}): ReactElement => {
  const action = useBusyAction(onClose);
  const { run } = action;
  const confirm = useCallback((): void => run(onDelete), [onDelete, run]);

  return (
    <PackDialogShell
      isBusy={action.isBusy}
      label={COPY.labelDeleteDesignSystem}
      onClose={onClose}
    >
      <PackDialogHead
        title={`Delete ${pack.name}?`}
        text="It leaves your library. Projects that use it keep their files."
        isBusy={action.isBusy}
        onClose={onClose}
      />
      <div className="modal-body">
        <PackDialogError error={action.error} />
      </div>
      <div className="modal-foot">
        <button
          type="button"
          className="btn ghost"
          data-autofocus
          onClick={onClose}
          disabled={action.isBusy}
        >
          {COPY.textCancel}
        </button>
        <button
          type="button"
          className="btn danger"
          onClick={confirm}
          disabled={action.isBusy}
        >
          {toDeleteLabel(action.isBusy)}
        </button>
      </div>
    </PackDialogShell>
  );
};

export { DeletePackDialog };
