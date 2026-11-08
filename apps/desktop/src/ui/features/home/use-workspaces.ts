import type { Project } from "@design-studio/contracts";
import { projectsInFolder } from "@design-studio/contracts/folders";
import type {
  WorkspaceFolder,
  WorkspaceList,
} from "@design-studio/contracts/folders";
import { useEffect, useState } from "react";

import { api, errorText } from "../../api.js";

const getLocation = (
  list: WorkspaceList | null,
  lastLocation: string | null
): string | null => {
  if (list === null) {
    return lastLocation;
  }

  if (
    list.folders.some(
      (folder) =>
        folder.path === lastLocation && !folder.missing && !folder.default
    )
  ) {
    return lastLocation;
  }

  return null;
};

const getDefaultFolder = (list: WorkspaceList | null): WorkspaceFolder | null =>
  list?.folders.find((folder) => folder.default) ?? null;

interface FolderView {
  readonly filterFolder: WorkspaceFolder | null;
  readonly shownProjects: Project[] | null;
}

const listProjectsByFolder = (
  projects: Project[] | null,
  list: WorkspaceList | null,
  filterId: string | null
): FolderView => {
  const filterFolder =
    list?.folders.find((folder) => folder.id === filterId) ?? null;

  if (projects && filterFolder) {
    return {
      filterFolder,
      shownProjects: projectsInFolder(projects, filterFolder.path),
    };
  }

  return { filterFolder, shownProjects: projects };
};

type Folders = (folders: WorkspaceFolder[]) => WorkspaceFolder[];

interface WorkspacesApi {
  readonly addFolder: (path: string) => Promise<WorkspaceFolder | null>;
  readonly forgetFolder: (target: WorkspaceFolder) => Promise<boolean>;
  readonly renameFolder: (id: string, label: string) => Promise<boolean>;
  readonly setDefaultFolder: (path: string) => Promise<boolean>;
  readonly workspaces: WorkspaceList | null;
}

const toFoldersWith = (
  folders: WorkspaceFolder[],
  saved: WorkspaceFolder
): WorkspaceFolder[] => {
  if (folders.some((folder) => folder.id === saved.id)) {
    return folders;
  }

  return [...folders, saved];
};

const toFoldersReplaced = (
  folders: WorkspaceFolder[],
  saved: WorkspaceFolder
): WorkspaceFolder[] =>
  folders.map((folder) => {
    if (folder.id === saved.id) {
      return saved;
    }

    return folder;
  });

const toFoldersWithout = (
  folders: WorkspaceFolder[],
  id: string
): WorkspaceFolder[] => folders.filter((folder) => folder.id !== id);

const toLoadMessage = (detail: string): string =>
  `Could not load your folders: ${detail}. Reload to try again.`;

const applyWorkspaces = async (
  isLive: () => boolean,
  onError: (message: string | null) => void,
  setWorkspaces: (list: WorkspaceList) => void
): Promise<void> => {
  try {
    const list = await api.listWorkspaces();

    if (isLive()) {
      setWorkspaces(list);
    }
  } catch (error: unknown) {
    if (isLive()) {
      onError(toLoadMessage(errorText(error)));
    }
  }
};

const runAttempt = async <Value>(
  onError: (message: string | null) => void,
  task: () => Promise<Value>,
  failed: Value
): Promise<Value> => {
  onError(null);

  try {
    return await task();
  } catch (error) {
    onError(errorText(error));

    return failed;
  }
};

const useWorkspaces = (
  onError: (message: string | null) => void
): WorkspacesApi => {
  const [workspaces, setWorkspaces] = useState<WorkspaceList | null>(null);

  useEffect(() => {
    let live = true;
    applyWorkspaces(() => live, onError, setWorkspaces);

    return (): void => {
      live = false;
    };
  }, [onError]);

  const update = (change: Folders): void =>
    setWorkspaces((list) => {
      if (list === null) {
        return list;
      }

      return { ...list, folders: change(list.folders) };
    });

  const addFolder = (path: string): Promise<WorkspaceFolder | null> =>
    runAttempt(
      onError,
      async () => {
        const saved = await api.addWorkspace(path);
        update((folders) => toFoldersWith(folders, saved));

        return saved;
      },
      null
    );

  const renameFolder = (id: string, label: string): Promise<boolean> =>
    runAttempt(
      onError,
      async () => {
        const saved = await api.renameWorkspace(id, label);
        update((folders) => toFoldersReplaced(folders, saved));

        return true;
      },
      false
    );

  const forgetFolder = (target: WorkspaceFolder): Promise<boolean> =>
    runAttempt(
      onError,
      async () => {
        await api.removeWorkspace(target.id);
        update((folders) => toFoldersWithout(folders, target.id));

        return true;
      },
      false
    );

  const setDefaultFolder = (path: string): Promise<boolean> =>
    runAttempt(
      onError,
      async () => {
        setWorkspaces(await api.setDefaultFolder(path));

        return true;
      },
      false
    );

  return {
    addFolder,
    forgetFolder,
    renameFolder,
    setDefaultFolder,
    workspaces,
  };
};

export {
  getDefaultFolder as defaultFolderOf,
  listProjectsByFolder as filterByFolder,
  getLocation as locationFor,
  useWorkspaces,
};

export type { FolderView, WorkspacesApi };
