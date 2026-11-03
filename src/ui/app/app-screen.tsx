import { useCallback } from "react";
import type { ReactNode } from "react";

import { Home } from "../components/Home";
import { uiStore, useUi } from "../storage";
import { Screen } from "./screen";
import { ScreenBoundary } from "./screen-boundary";
import {
  DesignSystems,
  NewDesignSystem,
  prefetchStudio,
  Studio,
} from "./screens";

const openProject = async (id: string): Promise<void> => {
  await prefetchStudio();
  uiStore.set({ activeProjectId: id });
};

const AppScreen = (): ReactNode => {
  const ui = useUi();

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
      <Home onOpen={onOpen} />
    </ScreenBoundary>
  );
};

export { AppScreen };
