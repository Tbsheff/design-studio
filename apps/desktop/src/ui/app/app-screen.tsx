import { Suspense, useCallback } from "react";
import type { ReactNode } from "react";

import { openLayer } from "../features/commands";
import { uiStore, useUi } from "../platform/storage";
import { openProject as openProjectAt } from "./project-nav";
import { Screen } from "./screen";
import { ScreenBoundary } from "./screen-boundary";
import { prefetchStudio } from "./screen-preload";
import { DesignSystems, Home, NewDesignSystem, Studio } from "./screens";
import { useHomeCommands } from "./use-home-commands";

const openProject = async (id: string): Promise<void> => {
  await prefetchStudio();
  uiStore.set({ activeProjectId: id });
};

const AppScreen = (): ReactNode => {
  const ui = useUi();
  const onCommands = useHomeCommands();

  const onExit = useCallback((): void => {
    uiStore.set({ activeProjectId: null });
  }, []);

  const onCancel = useCallback((): void => {
    uiStore.set({ returnTo: "home", screen: ui.returnTo });
  }, [ui.returnTo]);

  const onCreated = useCallback((id: string): void => {
    uiStore.set({
      activeProjectId: id,
      libraryFrom: null,
      returnTo: "home",
      screen: "home",
    });
  }, []);

  const onOpen = useCallback((id: string): void => {
    void openProject(id);
  }, []);

  const onOpenRoute = useCallback((id: string, route: string): void => {
    openProjectAt(id, route);
  }, []);

  if (ui.activeProjectId) {
    return (
      <Screen>
        <Studio
          key={ui.activeProjectId}
          onExit={onExit}
          projectId={ui.activeProjectId}
        />
      </Screen>
    );
  }

  if (ui.screen === "new-design-system") {
    return (
      <Screen>
        <NewDesignSystem onCancel={onCancel} onCreated={onCreated} />
      </Screen>
    );
  }

  if (ui.screen === "design-systems") {
    return (
      <Screen>
        <DesignSystems from={ui.libraryFrom} />
      </Screen>
    );
  }

  return (
    <ScreenBoundary>
      <Suspense fallback={null}>
        <Home
          onCommands={onCommands}
          onLayer={openLayer}
          onOpen={onOpen}
          onOpenRoute={onOpenRoute}
        />
      </Suspense>
    </ScreenBoundary>
  );
};

export { AppScreen };
