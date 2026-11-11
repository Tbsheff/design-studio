import type { Project } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { api, errorText } from "../../api.js";
import type { AppChipState } from "./use-app-chip.js";
import { useWorkspaceNav } from "./use-workspace-nav.js";
import type { WorkspaceNav } from "./use-workspace-nav.js";
import type { Workspace } from "./workspace-model.js";

interface WorkspaceTarget {
  readonly isEditApp: boolean;
  readonly nav: WorkspaceNav;
  readonly setIsEditApp: (isEditApp: boolean) => void;
}

interface TargetDeps {
  readonly app: AppChipState;
  readonly loadProjects: () => Promise<void>;
  readonly projects: readonly Project[] | null;
  readonly setFormError: (message: string | null) => void;
}

interface LinkedPath {
  readonly path: string;
  readonly projectId: string;
}

const isHeldBy = (workspace: Workspace, projectId: string): boolean =>
  workspace.anchor?.id === projectId || workspace.app?.id === projectId;

const toWorkspaceIndex = (
  workspaces: readonly Workspace[],
  path: string,
  linked: LinkedPath | null
): number => {
  const byFolder = workspaces.findIndex(
    (workspace) => workspace.folder === path
  );

  if (byFolder !== -1 || linked?.path !== path) {
    return byFolder;
  }

  return workspaces.findIndex((workspace) =>
    isHeldBy(workspace, linked.projectId)
  );
};

const useFolderLink = (deps: TargetDeps, nav: WorkspaceNav): void => {
  const { app, loadProjects, projects, setFormError } = deps;
  const { onSelect, selected, selectedIndex, workspaces } = nav;
  const path = app.chip?.path ?? null;
  const [seenPath, setSeenPath] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [linked, setLinked] = useState<LinkedPath | null>(null);
  const linking = useRef<string | null>(null);
  let index = -1;

  if (path !== seenPath) {
    setSeenPath(path);
    setPending(path);
  }

  const isPending = pending !== null && pending === path;

  if (isPending) {
    if (selected?.folder === path) {
      setPending(null);
    } else {
      index = toWorkspaceIndex(workspaces, pending, linked);
    }
  }

  if (index !== -1) {
    setPending(null);

    if (index !== selectedIndex) {
      onSelect(index);
    }
  }

  const linkPath = isPending && index === -1 && projects !== null;

  useEffect(() => {
    if (
      !linkPath ||
      path === null ||
      linking.current === path ||
      linked?.path === path
    ) {
      return;
    }

    linking.current = path;
    let isLive = true;

    const linkFolder = async (): Promise<void> => {
      try {
        const done = await api.importProject(path, { isWorkspace: true });
        await loadProjects();

        if (isLive) {
          setLinked({ path, projectId: done.project.id });
        }
      } catch (error: unknown) {
        if (isLive) {
          setFormError(errorText(error));
        }
      }

      linking.current = null;
    };

    void linkFolder();

    return (): void => {
      isLive = false;
      linking.current = null;
    };
  }, [linkPath, linked, loadProjects, path, setFormError]);
};

const useWorkspaceTarget = (deps: TargetDeps): WorkspaceTarget => {
  const nav = useWorkspaceNav(deps.projects, deps.app);
  const [isEditApp, setIsEditApp] = useState(false);
  const [shownId, setShownId] = useState<string | null>(null);
  const selectedId = nav.selected?.id ?? null;

  if (selectedId !== shownId) {
    setShownId(selectedId);
    setIsEditApp(false);
  }

  useFolderLink(deps, nav);

  const setEditApp = useCallback((next: boolean): void => {
    setIsEditApp(next);
  }, []);

  return { isEditApp, nav, setIsEditApp: setEditApp };
};

export { useWorkspaceTarget };

export type { WorkspaceTarget };
