import type { SelectionContext } from "@design-studio/contracts";
import { UiSelect, useModalDialog } from "@design-studio/ui";
import type { KeyboardEvent, ReactElement } from "react";
import { useCallback, useMemo } from "react";

import { CcForm } from "./cc-form.js";
import { COPY } from "./copy.js";
import { toFolderPlaceholder } from "./create-component-model.js";
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
  const { onMouseDown, ref } = useModalDialog(form.requestClose);
  const close = useCallback(() => onClose(), [onClose]);
  const { folder, folders, setFolder } = form;

  const options = useMemo(
    () =>
      (folders ?? []).map((item) => ({
        label: `${item.label} · ${item.folder}`,
        value: item.folder,
      })),
    [folders]
  );

  return (
    <dialog
      ref={ref}
      className="modal cc-dialog"
      aria-label={COPY.labelCreateComponent}
      onMouseDown={onMouseDown}
      onKeyDown={stopEscape}
    >
      <CcForm count={selection.length} form={form} onClose={close}>
        <UiSelect
          className="ins-select cc-folder"
          aria-label={COPY.labelFolder}
          value={folder}
          placeholder={toFolderPlaceholder(folders)}
          disabled={!folders?.length}
          options={options}
          onChange={setFolder}
        />
      </CcForm>
    </dialog>
  );
};

export { CreateComponentDialog };
