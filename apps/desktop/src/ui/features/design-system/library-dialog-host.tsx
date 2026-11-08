import type { ReactElement } from "react";

import {
  DeletePackDialog,
  ImportConflictDialog,
  RenamePackDialog,
} from "./library-dialogs.js";
import { PackDetailDialog } from "./pack-detail.js";
import type { Library } from "./use-library.js";

const LibraryDialogHost = ({
  library,
}: {
  library: Library;
}): ReactElement | null => {
  const {
    actions,
    chooseConflict,
    closeDialog,
    closePack,
    deleteSelected,
    dialog,
    renameSelected,
    selected,
  } = library;

  if (dialog?.kind === "rename") {
    return (
      <RenamePackDialog
        pack={dialog.pack}
        onClose={closeDialog}
        onRename={renameSelected}
      />
    );
  }

  if (dialog?.kind === "delete") {
    return (
      <DeletePackDialog
        pack={dialog.pack}
        onClose={closeDialog}
        onDelete={deleteSelected}
      />
    );
  }

  if (dialog?.kind === "conflict") {
    return (
      <ImportConflictDialog
        existing={dialog.existing}
        onClose={closeDialog}
        onChoose={chooseConflict}
      />
    );
  }

  if (selected) {
    return (
      <PackDetailDialog
        key={selected.id}
        pack={selected}
        actions={actions}
        onClose={closePack}
      />
    );
  }

  return null;
};

export { LibraryDialogHost };
