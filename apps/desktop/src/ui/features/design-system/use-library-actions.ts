import type { PackSummary } from "@design-studio/contracts";
import { useMemo } from "react";

import { downloadBlob } from "../../domain/format.js";
import { packApi } from "../../platform/pack-api.js";
import type { LibraryFrom } from "../../platform/storage.js";
import type { LibraryContext } from "./library-context.js";
import { leave } from "./library-model.js";
import type { PackDetailActions } from "./pack-detail-actions.js";
import { refreshPacks } from "./packs.js";

const toApply = (from: LibraryFrom | null): PackDetailActions["onApply"] => {
  if (!from) {
    return null;
  }

  return async (pack) => {
    await packApi.applyPack(from.projectId, from.directionId, pack.id);
    leave({ activeProjectId: from.projectId });
  };
};

const useLibraryActions = (
  from: LibraryFrom | null,
  { setDialog, setSelectedId, show }: LibraryContext
): PackDetailActions =>
  useMemo(
    () => ({
      onApply: toApply(from),
      onDelete: (pack: PackSummary) => setDialog({ kind: "delete", pack }),
      onDuplicate: async (pack: PackSummary) => {
        const duplicate = await packApi.duplicatePack(pack.id);

        refreshPacks();
        show(`Made ${duplicate.name}.`);
        setSelectedId(duplicate.id);
      },
      onExport: async (pack: PackSummary) =>
        downloadBlob(await packApi.exportPack(pack.id), `${pack.id}.zip`),
      onOpenEditor: async (pack: PackSummary) => {
        const { project } = await packApi.openPackEditor(pack.id);

        leave({ activeProjectId: project.id });
      },
      onRename: (pack: PackSummary) => setDialog({ kind: "rename", pack }),
      onUseInNew: (pack: PackSummary) =>
        leave({ activeProjectId: null, lastPackId: pack.id }),
    }),
    [from, setDialog, setSelectedId, show]
  );

export { useLibraryActions };
