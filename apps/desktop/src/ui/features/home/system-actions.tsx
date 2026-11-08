import { useCallback } from "react";
import type { ReactElement } from "react";

import { uiStore } from "../../platform/storage.js";
import { copy } from "./copy.js";

const SystemActions = (): ReactElement => {
  const openNew = useCallback((): void => {
    uiStore.set({ returnTo: "home", screen: "new-design-system" });
  }, []);

  const openLibrary = useCallback((): void => {
    uiStore.set({ libraryFrom: null, screen: "design-systems" });
  }, []);

  return (
    <>
      <button type="button" className="btn small" onClick={openNew}>
        {copy.newDesignSystem}
      </button>
      <button type="button" className="btn small" onClick={openLibrary}>
        {copy.openLibrary}
      </button>
    </>
  );
};

export { SystemActions };
