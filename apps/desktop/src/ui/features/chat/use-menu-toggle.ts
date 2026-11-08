import { useCallback } from "react";

import type { UsePlacedPopoverResult } from "./composer-menu-model.js";

const useMenuToggle = (
  menu: UsePlacedPopoverResult,
  onOpen: (() => void) | null
): (() => void) => {
  const { open, toggle } = menu;

  return useCallback((): void => {
    if (!open) {
      onOpen?.();
    }

    toggle();
  }, [open, toggle, onOpen]);
};

export { useMenuToggle };
