import type { SelectionContext } from "@design-studio/contracts";
import type { KeyboardEvent, ReactElement } from "react";
import { useCallback } from "react";

import { CcFolderSelect } from "./cc-folder-select.js";
import { CcForm } from "./cc-form.js";
import { COPY } from "./copy.js";
import { useBackdropDialog } from "./use-backdrop-dialog.js";
import { useCreateComponent } from "./use-create-component.js";
import type { CreateComponentIds } from "./use-create-component.js";

interface Props {
  ids: CreateComponentIds;
  onClose: () => void;
  onDone: (message: string) => void;
  selection: SelectionContext[];
}

const stopEscape = (event: KeyboardEvent): void => {
  if (event.key === "Escape") {
    event.stopPropagation();
  }
};

const CreateComponentDialog = ({
  ids,
  onClose,
  onDone,
  selection,
}: Props): ReactElement => {
  const form = useCreateComponent(ids, selection, onDone, onClose);
  const ref = useBackdropDialog(form.requestClose);
  const close = useCallback(() => onClose(), [onClose]);
  const { folder, folders, setFolder } = form;

  return (
    <dialog
      ref={ref}
      className="modal cc-dialog"
      aria-label={COPY.labelCreateComponent}
      onKeyDown={stopEscape}
    >
      <CcForm count={selection.length} form={form} onClose={close}>
        <CcFolderSelect
          folder={folder}
          folders={folders}
          onChange={setFolder}
        />
      </CcForm>
    </dialog>
  );
};

export { CreateComponentDialog };
