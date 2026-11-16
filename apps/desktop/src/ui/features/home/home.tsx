import { useCallback } from "react";
import type { ReactElement } from "react";

import { toDataFlag } from "./data-flag-model.js";
import type { HomeLayer } from "./home-command-model.js";
import { HomeOverlays } from "./home-overlays.js";
import { IdeMain } from "./ide-main.js";
import { StatusBar } from "./status-bar.js";
import { useHomeIde } from "./use-home-ide.js";
import type { CommandSource } from "./use-home-ide.js";
import { useHomeScreen } from "./use-home-screen.js";

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
  const { base, composer, lib, refs, toasts } = screen;
  const { homeRef } = refs;
  const { clearToast, toast } = toasts;
  const { setIsTrashOpen: onTrashOpen } = base;
  const { loadProjects, projects } = lib;
  const { packs } = lib.packs;

  const { addAppFolder } = composer.flow;
  const { openSample } = lib.openFlows;

  const onAttach = useCallback((): void => {
    void addAppFolder();
  }, [addAppFolder]);

  const onSample = useCallback((): void => {
    void openSample();
  }, [openSample]);

  const ide = useHomeIde({
    onAttach,
    onCommands,
    onLayer,
    onOpen,
    onSample,
    onTrashOpen,
    packs,
    projects,
    target: screen.submit.target,
  });

  const { nav } = ide;

  const handleTrashClose = useCallback((): void => {
    onTrashOpen(false);
  }, [onTrashOpen]);

  const handleRestored = useCallback((): void => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div
      className="home home-ide"
      data-drop={toDataFlag(composer.root.isWindowDragged)}
      ref={homeRef}
    >
      <IdeMain
        ide={ide}
        onOpen={onOpen}
        onOpenRoute={onOpenRoute}
        screen={screen}
      />
      <StatusBar
        activity={ide.activity.activity}
        folder={nav.selected?.folder ?? null}
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
