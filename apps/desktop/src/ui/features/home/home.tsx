import { useCallback } from "react";
import type { ReactElement } from "react";

import { toDataFlag } from "./data-flag-model.js";
import { Header } from "./home-header.js";
import { HomeHero } from "./home-hero.js";
import { HomeLibraryBlock } from "./home-library-block.js";
import { HomeOverlays } from "./home-overlays.js";
import { useHomeScreen } from "./use-home-screen.js";

const Home = ({
  onOpen,
}: {
  readonly onOpen: (projectId: string) => void;
}): ReactElement => {
  const screen = useHomeScreen(onOpen);
  const { base, composer, lib, refs, toasts } = screen;
  const { homeRef } = refs;
  const { clearToast, toast } = toasts;
  const { setIsTrashOpen } = base;
  const { loadProjects } = lib;

  const openTrash = useCallback((): void => {
    setIsTrashOpen(true);
  }, [setIsTrashOpen]);

  const closeTrash = useCallback((): void => {
    setIsTrashOpen(false);
  }, [setIsTrashOpen]);

  const reloadProjects = useCallback((): void => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div
      className="home"
      data-drop={toDataFlag(composer.root.isWindowDragged)}
      ref={homeRef}
    >
      <Header onTrash={openTrash} />
      <main className="home-main">
        <HomeHero screen={screen} />
        <HomeLibraryBlock screen={screen} />
      </main>
      <HomeOverlays
        isTrashOpen={base.isTrashOpen}
        onCloseTrash={closeTrash}
        onRestored={reloadProjects}
        doctor={base.doctor}
        toast={toast}
        onToastDone={clearToast}
      />
    </div>
  );
};

export { Home };
