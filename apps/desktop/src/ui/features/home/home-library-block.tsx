import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { uiStore } from "../../platform/storage.js";
import { focusRequest } from "./focus-bus-model.js";
import { LibraryArea } from "./library-area.js";
import { Library } from "./library-panel.js";
import type { HomeScreen } from "./use-home-screen.js";
import { toListedProjects } from "./workspace-model.js";

const HomeLibraryBlock = ({
  hasPrototypesTab,
  screen,
}: {
  readonly hasPrototypesTab: boolean;
  readonly screen: HomeScreen;
}): ReactElement => {
  const { composer, lib, modules, ui } = screen;
  const { loadProjects, setQuery } = lib;
  const { putFolder } = composer.flow;

  const listed = useMemo(
    () => toListedProjects(lib.projects ?? []),
    [lib.projects]
  );

  const retry = useCallback((): void => {
    loadProjects();
  }, [loadProjects]);

  const pickPack = useCallback((id: string | null): void => {
    uiStore.set({ lastPackId: id });
    focusRequest("prompt", false, true);
  }, []);

  return (
    <LibraryArea
      isEmpty={ui.isEmpty}
      listError={lib.listError}
      onRetry={retry}
      onUse={putFolder}
    >
      {lib.projects !== null && (
        <Library
          lib={modules.library}
          projects={listed}
          health={lib.health}
          homeDir={lib.homeDir}
          actions={lib.actions}
          packs={lib.packs}
          pack={lib.pack}
          query={lib.query}
          onQuery={setQuery}
          searchRef={lib.searchRef}
          listError={lib.listError}
          onPickPack={pickPack}
          hasPrototypesTab={hasPrototypesTab}
        />
      )}
    </LibraryArea>
  );
};

export { HomeLibraryBlock };
