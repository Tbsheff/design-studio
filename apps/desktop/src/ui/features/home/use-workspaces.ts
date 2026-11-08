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

const listProjectsByFolder = (
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
    let live = true;

    const load = async (): Promise<void> => {
      try {
        const list = await api.listWorkspaces();

        if (live) {
          setWorkspaces(list);
        }
      } catch (error: unknown) {
        if (live) {
          onError(
            `Could not load your folders: ${errorText(error)}. Reload to try again.`
          );
        }
      }
    };

    load();

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
      update((folders) => {
        if (folders.some((folder) => folder.id === saved.id)) {
          return folders;
        }

        return [...folders, saved];
      });

      return saved;
    }, null);

  const renameFolder = (id: string, label: string): Promise<boolean> =>
    attempt(async () => {
      const saved = await api.renameWorkspace(id, label);
      update((folders) =>
        folders.map((folder) => {
          if (folder.id === id) {
            return saved;
          }

          return folder;
        })
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

export {
  getDefaultFolder as defaultFolderOf,
  listProjectsByFolder as filterByFolder,
  getLocation as locationFor,
  useWorkspaces,
};
