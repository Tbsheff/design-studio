import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { COPY } from "./copy.js";
import { PackDialogShell } from "./library-dialogs.js";
import { PackDialogError } from "./pack-dialog-error.js";
import { PackDialogHead } from "./pack-dialog-head.js";
import { useBusyAction } from "./use-busy-action.js";

const ImportConflictDialog = ({
  existing,
  onChoose,
  onClose,
}: {
  existing: PackSummary;
  onChoose: (mode: "replace" | "copy") => Promise<void>;
  onClose: () => void;
}): ReactElement => {
  const action = useBusyAction(onClose);
  const { run } = action;

  const keepBoth = useCallback(
    (): void => run(() => onChoose("copy")),
    [onChoose, run]
  );

  const replace = useCallback(
    (): void => run(() => onChoose("replace")),
    [onChoose, run]
  );

  return (
    <PackDialogShell
      isBusy={action.isBusy}
      label={COPY.labelDesignSystemAlreadyInYour}
      onClose={onClose}
    >
      <PackDialogHead
        title={`${existing.name} is already in your library`}
        text="Replace it with the files in the zip, or keep both. Projects keep their own files."
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
          onClick={onClose}
          disabled={action.isBusy}
        >
          {COPY.textCancel}
        </button>
        <button
          type="button"
          className="btn"
          onClick={keepBoth}
          disabled={action.isBusy}
        >
          {COPY.textKeepBoth}
        </button>
        <button
          type="button"
          className="btn primary"
          data-autofocus
          onClick={replace}
          disabled={action.isBusy}
        >
          {COPY.textReplace}
        </button>
      </div>
    </PackDialogShell>
  );
};

export { ImportConflictDialog };
