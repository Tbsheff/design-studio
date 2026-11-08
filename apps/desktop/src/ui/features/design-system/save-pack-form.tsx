import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useCallback, useState } from "react";

import { COPY } from "./copy.js";
import { PackDialogError } from "./pack-dialog-error.js";
import { PackDialogHead } from "./pack-dialog-head.js";
import { RenameNameField } from "./rename-name-field.js";
import { SaveChoice } from "./save-choice.js";
import { SavePackFoot } from "./save-pack-foot.js";
import { toCopyName, toSaveText } from "./save-pack-model.js";
import type { BusyAction } from "./use-busy-action.js";

const SavePackForm = ({
  action,
  canCopy,
  defaultName,
  isUpdating,
  onClose,
  onSave,
}: {
  action: BusyAction;
  canCopy: boolean;
  defaultName: string;
  isUpdating: boolean;
  onClose: () => void;
  onSave: (name: string, asNew: boolean) => Promise<void>;
}): ReactElement => {
  const [name, setName] = useState(defaultName);
  const [isNew, setIsNew] = useState(false);
  const trimmed = name.trim();
  const { run } = action;

  const submit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (trimmed) {
        run(() => onSave(trimmed, isNew));
      }
    },
    [isNew, onSave, run, trimmed]
  );

  const useUpdate = useCallback((): void => {
    setIsNew(false);
    setName(defaultName);
  }, [defaultName]);

  const useNew = useCallback((): void => {
    setIsNew(true);
    setName(toCopyName(defaultName));
  }, [defaultName]);

  const changeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setName(event.target.value);
    },
    []
  );

  return (
    <form className="modal-form" onSubmit={submit}>
      <PackDialogHead
        isBusy={action.isBusy}
        onClose={onClose}
        text={toSaveText(isNew, isUpdating, defaultName)}
        title={COPY.labelSaveToLibrary}
      />
      <div className="modal-body">
        <SaveChoice
          defaultName={defaultName}
          isNew={isNew}
          isShown={canCopy}
          onNew={useNew}
          onUpdate={useUpdate}
        />
        <RenameNameField name={name} onChange={changeName} />
        <PackDialogError error={action.error} />
      </div>
      <SavePackFoot
        canSave={trimmed !== ""}
        isBusy={action.isBusy}
        onClose={onClose}
      />
    </form>
  );
};

export { SavePackForm };
