import { useCallback } from "react";
import type { ReactElement } from "react";

import { ActivityColumn } from "./activity-column.js";
import { toDataFlag } from "./data-flag-model.js";
import type { HomeLayer } from "./home-command-model.js";
import { HomeHero } from "./home-hero.js";
import { HomeLibraryBlock } from "./home-library-block.js";
import { modelSummary } from "./home-model.js";
import { HomeOverlays } from "./home-overlays.js";
import { HomeSidebar } from "./home-sidebar.js";
import { StatusBar } from "./status-bar.js";
import { useHomeIde } from "./use-home-ide.js";
import type { CommandSource } from "./use-home-ide.js";
import { useHomeScreen } from "./use-home-screen.js";
import { WorkspaceCenter } from "./workspace-center.js";
import { WorkspaceHead } from "./workspace-head.js";

interface HomeProps {
  readonly onCommands: (source: CommandSource | null) => void;
  readonly onLayer: (layer: HomeLayer) => void;
  readonly onOpen: (projectId: string) => void;
  readonly onOpenRoute: (projectId: string, route: string) => void;
}

const Home = ({
  onCommands,
  onLayer,
  onOpen,
  onOpenRoute,
}: HomeProps): ReactElement => {
  const screen = useHomeScreen(onOpen);
  const { base, composer, draft, lib, refs, toasts } = screen;
  const { clearToast, toast } = toasts;
  const { setIsTrashOpen } = base;
  const { loadProjects } = lib;

  const { addAppFolder } = composer.flow;
  const { openSample } = lib.openFlows;

  const handleAttach = useCallback((): void => {
    void addAppFolder();
  }, [addAppFolder]);

  const handleSample = useCallback((): void => {
    void openSample();
  }, [openSample]);

  const ide = useHomeIde({
    app: composer.flow.app,
    onAttach: handleAttach,
    onCommands,
    onLayer,
    onOpen,
    onSample: handleSample,
    onTrashOpen: setIsTrashOpen,
    packs: lib.packs.packs,
    projects: lib.projects,
  });

  const { nav } = ide;

  const handleTrashClose = useCallback((): void => {
    setIsTrashOpen(false);
  }, [setIsTrashOpen]);

  const handleRestored = useCallback((): void => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div
      className="home home-ide"
      data-drop={toDataFlag(composer.root.isWindowDragged)}
      ref={refs.homeRef}
    >
      <div className="ide-main">
        <HomeSidebar
          nav={nav}
          now={ide.activity.now}
          onAttach={ide.onAttach}
          onOpen={onOpen}
          onOpenRoute={onOpenRoute}
          onSearch={ide.onSearch}
          onTrash={ide.onTrash}
          projects={lib.projects}
        />
        <main className="ide-center">
          <WorkspaceHead
            homeDir={lib.homeDir}
            packName={ide.packName}
            workspace={nav.selected}
          />
          <HomeHero screen={screen} />
          <WorkspaceCenter
            onOpen={onOpen}
            onStarter={ide.onStarter}
            packName={ide.packName}
            workspace={nav.selected}
          />
        </main>
        <ActivityColumn
          onOpen={onOpen}
          onSearch={ide.onSearch}
          state={ide.activity}
        />
        <div className="ide-library">
          <HomeLibraryBlock screen={screen} />
        </div>
      </div>
      <StatusBar
        activity={ide.activity.activity}
        folder={nav.selected?.folder ?? null}
        model={modelSummary(draft.settingsDraft.model, 1)}
      />
      <HomeOverlays
        isTrashOpen={base.isTrashOpen}
        onCloseTrash={handleTrashClose}
        onRestored={handleRestored}
        doctor={base.doctor}
        toast={toast}
        onToastDone={clearToast}
      />
    </div>
  );
};

export { Home };

export type { HomeProps };
