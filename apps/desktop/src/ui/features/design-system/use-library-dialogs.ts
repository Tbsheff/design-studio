import { useCallback } from "react";

import { packApi } from "../../platform/pack-api.js";
import type { LibraryContext } from "./library-context.js";
import type { LibraryDialog } from "./library-model.js";
import { toImportedText } from "./library-model.js";
import { refreshPacks } from "./packs.js";

interface LibraryDialogActions {
  readonly chooseConflict: (mode: "replace" | "copy") => Promise<void>;
  readonly deleteSelected: () => Promise<void>;
  readonly renameSelected: (name: string) => Promise<void>;
}

const useLibraryDialogs = (
  dialog: LibraryDialog,
  { setSelectedId, show }: LibraryContext
): LibraryDialogActions => {
  const renameSelected = useCallback(
    async (name: string): Promise<void> => {
      if (dialog?.kind !== "rename") {
        return;
      }

      await packApi.renamePack(dialog.pack.id, name);
      refreshPacks();
      show(`Renamed to ${name}.`);
    },
    [dialog, show]
  );

  const deleteSelected = useCallback(async (): Promise<void> => {
    if (dialog?.kind !== "delete") {
      return;
    }

    await packApi.deletePack(dialog.pack.id);
    setSelectedId(null);
    refreshPacks();
    show(`Deleted ${dialog.pack.name}.`);
  }, [dialog, setSelectedId, show]);

  const chooseConflict = useCallback(
    async (mode: "replace" | "copy"): Promise<void> => {
      if (dialog?.kind !== "conflict") {
        return;
      }

      const result = await packApi.importPack(dialog.file, mode);

      refreshPacks();
      show(toImportedText(result.pack.name, result.replaced));
      setSelectedId(result.pack.id);
    },
    [dialog, setSelectedId, show]
  );

  return { chooseConflict, deleteSelected, renameSelected };
};

export { useLibraryDialogs };

export type { LibraryDialogActions };
