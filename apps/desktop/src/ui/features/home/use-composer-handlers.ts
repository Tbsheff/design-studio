import { useCallback, useMemo } from "react";

import type { AppSlotProps } from "./app-slot-model.js";
import type { ChipFlow } from "./use-chip-flow.js";

type BarApp = AppSlotProps & {
  readonly isFolderPopOpen: boolean;
  readonly onFolderClose: () => void;
  readonly onFolderPick: (path: string) => void;
};

interface ComposerHandlers {
  readonly barApp: BarApp;
  readonly closeMenu: () => void;
  readonly openTokensOnly: () => void;
  readonly toggleMenu: () => void;
}

const useComposerHandlers = (
  flow: ChipFlow,
  prompt: string
): ComposerHandlers => {
  const { addAppFolder, app, chipDoctor, openChip, putFolder } = flow;
  const { setIsAppMenuOpen, setIsFolderPopOpen } = flow;

  const closeMenu = useCallback((): void => {
    setIsAppMenuOpen(false);
  }, [setIsAppMenuOpen]);

  const toggleMenu = useCallback((): void => {
    setIsAppMenuOpen((open) => !open);
  }, [setIsAppMenuOpen]);

  const openTokensOnly = useCallback((): void => {
    setIsAppMenuOpen(false);
    openChip(prompt.trim(), true);
  }, [openChip, prompt, setIsAppMenuOpen]);

  const pickFolder = useCallback((): void => {
    addAppFolder();
  }, [addAppFolder]);

  const fixApp = useCallback((): void => {
    chipDoctor(prompt.trim());
  }, [chipDoctor, prompt]);

  const closeFolder = useCallback((): void => {
    setIsFolderPopOpen(false);
  }, [setIsFolderPopOpen]);

  const barApp = useMemo(
    () => ({
      chip: app.chip,
      isFolderPopOpen: flow.isFolderPopOpen,
      onAddFolder: pickFolder,
      onDoctor: fixApp,
      onFolderClose: closeFolder,
      onFolderPick: putFolder,
    }),
    [app.chip, closeFolder, fixApp, flow.isFolderPopOpen, pickFolder, putFolder]
  );

  return { barApp, closeMenu, openTokensOnly, toggleMenu };
};

export { useComposerHandlers };

export type { BarApp, ComposerHandlers };
