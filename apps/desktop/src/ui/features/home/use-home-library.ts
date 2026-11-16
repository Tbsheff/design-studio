import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { uiStore, useUi } from "../../platform/storage.js";
import { homeOf } from "./home-model.js";
import type { CardActions } from "./project-card-model.js";
import { useAppHealth } from "./projects-store-model.js";
import type { HomeBase } from "./use-home-base.js";
import { useHomeProjects } from "./use-home-projects.js";
import type { HomeProjects } from "./use-home-projects.js";
import type { HomeToastControls } from "./use-home-toast.js";
import { useOpenFlows } from "./use-open-flows.js";
import type { OpenFlows } from "./use-open-flows.js";
import { useProjectActions } from "./use-project-actions.js";
import { locationFor, useWorkspaces } from "./use-workspaces.js";
import type { WorkspacesApi } from "./use-workspaces.js";

interface HomeLibrary<Packs, Pack> extends HomeProjects {
  readonly actions: CardActions;
  readonly health: ReturnType<typeof useAppHealth>;
  readonly homeDir: string | null;
  readonly location: string | null;
  readonly openFlows: OpenFlows;
  readonly pack: Pack;
  readonly packs: Packs;
  readonly query: string;
  readonly setLocation: (path: string | null) => void;
  readonly setQuery: Dispatch<SetStateAction<string>>;
  readonly workspaces: WorkspacesApi;
}

interface LibraryDeps<Packs, Pack> {
  readonly homeBase: HomeBase;
  readonly onOpen: (projectId: string) => void;
  readonly pack: Pack;
  readonly packs: Packs;
  readonly toasts: HomeToastControls;
}

const setLocation = (path: string | null): void => {
  uiStore.set({ lastLocation: path });
};

const useHomeLibrary = <Packs, Pack>(
  deps: LibraryDeps<Packs, Pack>
): HomeLibrary<Packs, Pack> => {
  const { homeBase, onOpen, pack, packs, toasts } = deps;
  const { doctor, setBusy, setFormError, setIsTrashOpen } = homeBase;
  const workspaces = useWorkspaces(setFormError);
  const projectsState = useHomeProjects();
  const health = useAppHealth(projectsState.projects);
  const [query, setQuery] = useState("");
  const { lastLocation } = useUi();
  const homeDir = homeOf(workspaces.workspaces);
  const location = locationFor(workspaces.workspaces, lastLocation);

  const openFlows = useOpenFlows({
    doctor,
    health,
    homeDir,
    location,
    onOpen,
    setBusy,
    setFormError,
  });

  const actions = useProjectActions({
    homeDir,
    onOpen: openFlows.openProject,
    onOpenTrash: (): void => setIsTrashOpen(true),
    showToast: toasts.showToast,
  });

  return {
    ...projectsState,
    actions,
    health,
    homeDir,
    location,
    openFlows,
    pack,
    packs,
    query,
    setLocation,
    setQuery,
    workspaces,
  };
};

export { useHomeLibrary };

export type { HomeLibrary, LibraryDeps };
