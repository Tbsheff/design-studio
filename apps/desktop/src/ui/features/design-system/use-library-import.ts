import type { PackSummary } from "@design-studio/contracts";
import { useCallback, useState, useTransition } from "react";

import { ApiError, errorText } from "../../api.js";
import { packApi } from "../../platform/pack-api.js";
import type { LibraryContext } from "./library-context.js";
import { existingOf } from "./library-errors.js";
import { toImportedText } from "./library-model.js";
import { refreshPacks } from "./packs.js";

interface LibraryImport {
  readonly importError: string | null;
  readonly importFile: (file: File) => void;
  readonly isImporting: boolean;
}

const useLibraryImport = ({
  setDialog,
  setSelectedId,
  show,
}: LibraryContext): LibraryImport => {
  const [isImporting, startImport] = useTransition();
  const [importError, setImportError] = useState<string | null>(null);

  const importFile = useCallback(
    (file: File): void => {
      setImportError(null);
      startImport(async () => {
        try {
          const result = await packApi.importPack(file);

          refreshPacks();
          show(toImportedText(result.pack.name, result.replaced));
          setSelectedId(result.pack.id);
        } catch (error) {
          let existing: PackSummary | null = null;

          if (error instanceof ApiError) {
            existing = existingOf(error);
          }

          if (existing) {
            setDialog({ existing, file, kind: "conflict" });

            return;
          }

          setImportError(errorText(error));
        }
      });
    },
    [setDialog, setSelectedId, show]
  );

  return { importError, importFile, isImporting };
};

export { useLibraryImport };

export type { LibraryImport };
