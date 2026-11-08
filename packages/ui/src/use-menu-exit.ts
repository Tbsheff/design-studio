import { useEffect } from "react";

import { MENU_EXIT_MS } from "./ui-select-model.js";

const useMenuExit = (
  isOpen: boolean,
  isMounted: boolean,
  unmount: () => void
): void => {
  useEffect(() => {
    if (isOpen || !isMounted) {
      return;
    }

    const timer = globalThis.setTimeout(unmount, MENU_EXIT_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [isOpen, isMounted, unmount]);
};

export { useMenuExit };
