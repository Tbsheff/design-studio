import type { PackSummary } from "@design-studio/contracts";
import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useCallback, useState } from "react";

import { COPY } from "./copy.js";
import { PackDialogError } from "./pack-dialog-error.js";
import { PackDialogHead } from "./pack-dialog-head.js";
import { RenameNameField } from "./rename-name-field.js";
import type { BusyAction } from "./use-busy-action.js";

const toRenameLabel = (isBusy: boolean): string => {
  if (isBusy) {
    return "Renaming…";
  }

  return "Rename";
};

const RenamePackForm = ({
  action,
  onClose,
  onRename,
  pack,
}: {
  action: BusyAction;
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
  pack: PackSummary;
}): ReactElement => {
  const [name, setName] = useState(pack.name);
  const trimmed = name.trim();
  const canRename = trimmed !== "" && trimmed !== pack.name;
  const { run } = action;

  const submit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (canRename) {
        run(() => onRename(trimmed));
      }
    },
    [canRename, onRename, run, trimmed]
  );

  const changeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setName(event.target.value),
    []
  );

  return (
    <form className="modal-form" onSubmit={submit}>
      <PackDialogHead
        title={COPY.titleRenameDesignSystem}
        text="Projects that use it keep working. Its id does not change."
        isBusy={action.isBusy}
        onClose={onClose}
      />
      <div className="modal-body">
        <RenameNameField name={name} onChange={changeName} />
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
          type="submit"
          className="btn primary"
          disabled={action.isBusy || !canRename}
        >
          {toRenameLabel(action.isBusy)}
        </button>
      </div>
    </form>
  );
};

export { RenamePackForm };
