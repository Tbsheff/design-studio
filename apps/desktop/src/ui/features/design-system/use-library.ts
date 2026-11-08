import type { PackProblem, PackSummary } from "@design-studio/contracts";
import { useCallback, useMemo, useState } from "react";

import { uiStore } from "../../platform/storage.js";
import type { LibraryFrom } from "../../platform/storage.js";
import type { LibraryDialog } from "./library-model.js";
import { leave } from "./library-model.js";
import type { PackDetailActions } from "./pack-detail-actions.js";
import { usePacks } from "./packs.js";
import { useLibraryActions } from "./use-library-actions.js";
import { useLibraryDialogs } from "./use-library-dialogs.js";
import type { LibraryDialogActions } from "./use-library-dialogs.js";
import { useLibraryImport } from "./use-library-import.js";
import type { LibraryImport } from "./use-library-import.js";
import { useLibraryProblems } from "./use-library-problems.js";
import { useLibraryToast } from "./use-library-toast.js";

interface Library extends LibraryDialogActions, LibraryImport {
  readonly actions: PackDetailActions;
  readonly back: () => void;
  readonly builtin: PackSummary[];
  readonly closeDialog: () => void;
  readonly closePack: () => void;
  readonly dialog: LibraryDialog;
  readonly error: string | null;
  readonly newDesignSystem: () => void;
  readonly openPack: (pack: PackSummary) => void;
  readonly packs: PackSummary[] | null;
  readonly problems: PackProblem[];
  readonly selected: PackSummary | null;
  readonly toast: string | null;
  readonly yours: PackSummary[];
}

const openNewDesignSystem = (): void => {
  uiStore.set({ returnTo: "design-systems", screen: "new-design-system" });
};

const useLibrary = (from: LibraryFrom | null): Library => {
  const { error, packs } = usePacks();
  const problems = useLibraryProblems(packs);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<LibraryDialog>(null);
  const { show, text: toast } = useLibraryToast();
  const context = useMemo(() => ({ setDialog, setSelectedId, show }), [show]);
  const imports = useLibraryImport(context);
  const actions = useLibraryActions(from, context);
  const dialogActions = useLibraryDialogs(dialog, context);

  const back = useCallback((): void => {
    if (from) {
      leave({ activeProjectId: from.projectId });

      return;
    }

    leave({});
  }, [from]);

  const openPack = useCallback(
    (pack: PackSummary): void => setSelectedId(pack.id),
    []
  );

  const closePack = useCallback((): void => setSelectedId(null), []);
  const closeDialog = useCallback((): void => setDialog(null), []);

  return {
    ...dialogActions,
    ...imports,
    actions,
    back,
    builtin: (packs ?? []).filter((pack) => pack.source === "builtin"),
    closeDialog,
    closePack,
    dialog,
    error,
    newDesignSystem: openNewDesignSystem,
    openPack,
    packs,
    problems,
    selected: packs?.find((pack) => pack.id === selectedId) ?? null,
    toast,
    yours: (packs ?? []).filter((pack) => pack.source === "user"),
  };
};

export { useLibrary };

export type { Library };
