import type { Project } from "@design-studio/contracts";
import { projectsInFolder } from "@design-studio/contracts/folders";
import type {
  WorkspaceFolder,
  WorkspaceList,
} from "@design-studio/contracts/folders";
import { useEffect, useState } from "react";

import { api, errorText } from "../../api.js";

const locationFor = (
  list: WorkspaceList | null,
  lastLocation: string | null
): string | null => {
  if (list === null) {
    return lastLocation;
  }

  return list.folders.some(
    (folder) =>
      folder.path === lastLocation && !folder.missing && !folder.default
  )
    ? lastLocation
    : null;
};

const defaultFolderOf = (list: WorkspaceList | null): WorkspaceFolder | null =>
  list?.folders.find((folder) => folder.default) ?? null;

const filterByFolder = (
  projects: Project[] | null,
  list: WorkspaceList | null,
  filterId: string | null
): {
  readonly filterFolder: WorkspaceFolder | null;
  readonly shownProjects: Project[] | null;
} => {
  const filterFolder =
    list?.folders.find((folder) => folder.id === filterId) ?? null;

  return {
    filterFolder,
    shownProjects:
      projects && filterFolder
        ? projectsInFolder(projects, filterFolder.path)
        : projects,
  };
};

type Folders = (folders: WorkspaceFolder[]) => WorkspaceFolder[];

const useWorkspaces = (onError: (message: string | null) => void) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceList | null>(null);

  useEffect(() => {
    api
      .listWorkspaces()
      .then(setWorkspaces)
      .catch((error) =>
        onError(
          `Could not load your folders: ${errorText(error)}. Reload to try again.`
        )
      );
  }, [onError]);

  const update = (change: Folders): void =>
    setWorkspaces((list) =>
      list === null ? list : { ...list, folders: change(list.folders) }
    );

  const attempt = async <Value>(
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

  const addFolder = (path: string): Promise<WorkspaceFolder | null> =>
    attempt(async () => {
      const saved = await api.addWorkspace(path);
      update((folders) =>
        folders.some((folder) => folder.id === saved.id)
          ? folders
          : [...folders, saved]
      );

      return saved;
    }, null);

  const renameFolder = (id: string, label: string): Promise<boolean> =>
    attempt(async () => {
      const saved = await api.renameWorkspace(id, label);
      update((folders) =>
        folders.map((folder) => (folder.id === id ? saved : folder))
      );

      return true;
    }, false);

  const forgetFolder = (target: WorkspaceFolder): Promise<boolean> =>
    attempt(async () => {
      await api.removeWorkspace(target.id);
      update((folders) => folders.filter((folder) => folder.id !== target.id));

      return true;
    }, false);

  const setDefaultFolder = (path: string): Promise<boolean> =>
    attempt(async () => {
      setWorkspaces(await api.setDefaultFolder(path));

      return true;
    }, false);

  return {
    addFolder,
    forgetFolder,
    renameFolder,
    setDefaultFolder,
    workspaces,
  };
};

export { defaultFolderOf, filterByFolder, locationFor, useWorkspaces };
