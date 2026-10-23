import { useEffect, useState } from 'react';
import type { Project } from '../shared/contracts';
import { projectsInFolder, type WorkspaceFolder, type WorkspaceList } from '../shared/folders';
import { api, errorText } from './api';

export function locationFor(list: WorkspaceList | null, lastLocation: string | null): string | null {
  if (list === null) return lastLocation;
  return list.folders.some((folder) => folder.path === lastLocation && !folder.missing) ? lastLocation : null;
}

export function filterByFolder(projects: Project[] | null, list: WorkspaceList | null, filterId: string | null): { filterFolder: WorkspaceFolder | null; shownProjects: Project[] | null } {
  const filterFolder = list?.folders.find((folder) => folder.id === filterId) ?? null;
  return { filterFolder, shownProjects: projects && filterFolder ? projectsInFolder(projects, filterFolder.path) : projects };
}

type Folders = (folders: WorkspaceFolder[]) => WorkspaceFolder[];

export function useWorkspaces(onError: (message: string | null) => void) {
  const [workspaces, setWorkspaces] = useState<WorkspaceList | null>(null);

  useEffect(() => {
    api
      .listWorkspaces()
      .then(setWorkspaces)
      .catch((err) => onError(`Could not load your folders: ${errorText(err)}. Reload to try again.`));
  }, [onError]);

  const update = (change: Folders) => setWorkspaces((list) => (list === null ? list : { ...list, folders: change(list.folders) }));

  const attempt = async <T>(task: () => Promise<T>, failed: T): Promise<T> => {
    onError(null);
    try {
      return await task();
    } catch (err) {
      onError(errorText(err));
      return failed;
    }
  };

  const addFolder = (path: string): Promise<WorkspaceFolder | null> =>
    attempt(async () => {
      const saved = await api.addWorkspace(path);
      update((folders) => (folders.some((folder) => folder.id === saved.id) ? folders : [...folders, saved]));
      return saved;
    }, null);

  const renameFolder = (id: string, label: string): Promise<boolean> =>
    attempt(async () => {
      const saved = await api.renameWorkspace(id, label);
      update((folders) => folders.map((folder) => (folder.id === id ? saved : folder)));
      return true;
    }, false);

  const forgetFolder = (target: WorkspaceFolder): Promise<boolean> =>
    attempt(async () => {
      await api.removeWorkspace(target.id);
      update((folders) => folders.filter((folder) => folder.id !== target.id));
      return true;
    }, false);

  return { workspaces, addFolder, renameFolder, forgetFolder };
}
