import { createLiveStore, useLive } from "../../platform/live-store.js";

const outlineProjects = createLiveStore<readonly string[]>([]);

const isOutlineOn = (projects: readonly string[], projectId: string): boolean =>
  projects.includes(projectId);

const toggleOutline = (projectId: string): void => {
  const current = outlineProjects.get();

  if (current.includes(projectId)) {
    outlineProjects.set(current.filter((id) => id !== projectId));

    return;
  }

  outlineProjects.set([...current, projectId]);
};

const useOutlineProjects = (): readonly string[] => useLive(outlineProjects);

export { isOutlineOn, toggleOutline, useOutlineProjects };
