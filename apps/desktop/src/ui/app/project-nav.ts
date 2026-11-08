import { uiStore } from "../platform/storage.js";
import { prefetchStudio } from "./screen-preload.js";

const OPEN_ROUTE_EVENT = "studio:open-route";

type Switcher = (projectId: string | null) => void;

let switcher: Switcher | null = null;
let pending: { projectId: string; route: string } | null = null;

function setProjectSwitcher(next: Switcher): () => void {
  switcher = next;

  return () => {
    if (switcher === next) {
      switcher = null;
    }
  };
}

function takePendingRoute(projectId: string): string | null {
  if (pending?.projectId !== projectId) {
    return null;
  }

  const { route } = pending;
  pending = null;

  return route;
}

const openProjectHome = async (projectId: string): Promise<void> => {
  await prefetchStudio();
  uiStore.set({ activeProjectId: projectId, screen: "home" });
};

function openProject(projectId: string, route?: string): void {
  if (uiStore.get().activeProjectId === projectId) {
    pending = null;

    if (route) {
      globalThis.dispatchEvent(
        new CustomEvent(OPEN_ROUTE_EVENT, { detail: { projectId, route } })
      );
    }

    return;
  }

  pending = route ? { projectId, route } : null;

  if (switcher) {
    switcher(projectId);

    return;
  }

  void openProjectHome(projectId);
}

function goHome(): void {
  if (switcher && uiStore.get().activeProjectId) {
    switcher(null);
  } else {
    uiStore.set({ activeProjectId: null, screen: "home" });
  }
}

export {
  OPEN_ROUTE_EVENT,
  setProjectSwitcher,
  takePendingRoute,
  openProject,
  goHome,
};
