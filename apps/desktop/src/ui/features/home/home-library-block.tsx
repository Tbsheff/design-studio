import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { uiStore } from "../../platform/storage.js";
import { focusRequest } from "./focus-bus-model.js";
import { LibraryArea } from "./library-area.js";
import { Library } from "./library-panel.js";
import type { HomeScreen } from "./use-home-screen.js";
import { toListedProjects } from "./workspace-model.js";

const HomeLibraryBlock = ({
  screen,
}: {
  readonly screen: HomeScreen;
}): ReactElement => {
  const { base, composer, lib, modules, ui } = screen;
  const { loadProjects, setQuery } = lib;
  const { openSample, openStarter } = lib.openFlows;
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
      isBusy={base.busy !== null}
      listError={lib.listError}
      onRetry={retry}
      onUse={putFolder}
      onSample={openSample}
      onStarter={openStarter}
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
        />
      )}
    </LibraryArea>
  );
};

export { HomeLibraryBlock };
