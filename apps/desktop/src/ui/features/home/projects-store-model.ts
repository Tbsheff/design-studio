import type { Project, TrashedProject } from "@design-studio/contracts";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { api, errorText, json } from "../../api.js";
import type { AppHealth, FoundApps } from "./deps.js";
import { isThumbnailPending } from "./project-list-model.js";

interface ProjectsState {
  readonly projects: Project[] | null;
  readonly error: string | null;
}

let state: ProjectsState = { error: null, projects: null };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const setProjectsState = (next: ProjectsState): void => {
  state = next;

  for (const listener of listeners) {
    listener();
  }
};

const runProjectsFetch = async (): Promise<void> => {
  try {
    const projects = await api.listProjects();
    setProjectsState({ error: null, projects });
  } catch (error: unknown) {
    setProjectsState({ ...state, error: errorText(error) });
  } finally {
    inflight = null;
  }
};

const runProjectsLoad = (): Promise<void> => {
  inflight ??= runProjectsFetch();

  return inflight;
};

const update = (change: (list: Project[]) => Project[]): void => {
  if (state.projects) {
    setProjectsState({ ...state, projects: change(state.projects) });
  }
};

const projectsApi = {
  duplicate: async (project: Project): Promise<Project> => {
    const { project: copy } = await api.duplicateProject(project.id);
    await runProjectsLoad();

    return copy;
  },
  found: (): Promise<FoundApps> => json<FoundApps>("GET", "/api/folders/found"),
  get: (): ProjectsState => state,
  health: (): Promise<AppHealth[]> =>
    json<AppHealth[]>("GET", "/api/home/health"),
  load: runProjectsLoad,
  pin: async (project: Project, isPinned: boolean): Promise<void> => {
    update((list) =>
      list.map((item) => {
        if (item.id === project.id) {
          return { ...item, settings: { ...item.settings, isPinned } };
        }

        return item;
      })
    );

    try {
      await api.updateSettings(project.id, { isPinned });
    } finally {
      void runProjectsLoad();
    }
  },
  rename: async (project: Project, name: string): Promise<Project> => {
    update((list) =>
      list.map((item) => {
        if (item.id === project.id) {
          return { ...item, name };
        }

        return item;
      })
    );

    try {
      return await api.renameProject(project.id, name);
    } finally {
      void runProjectsLoad();
    }
  },
  restore: async (trashId: string): Promise<void> => {
    await api.restoreProject(trashId);
    await runProjectsLoad();
  },
  reveal: (project: Project): Promise<{ readonly ok: true }> =>
    json<{ readonly ok: true }>(
      "POST",
      `/api/projects/${encodeURIComponent(project.id)}/reveal`
    ),
  subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return (): void => {
      listeners.delete(listener);
    };
  },
  trash: async (project: Project): Promise<TrashedProject> => {
    update((list) => list.filter((item) => item.id !== project.id));

    try {
      return await api.trashProject(project.id);
    } finally {
      void runProjectsLoad();
    }
  },
  update,
};

const POLL_FAST_MS = 500;
const POLL_MS = 1500;
const RECENT_MS = 120_000;

const isRecentlyUpdated = (project: Project): boolean =>
  Date.now() - project.updatedAt < RECENT_MS;

const toPollDelay = (projects: Project[]): number | null => {
  if (projects.some((project) => isThumbnailPending(project))) {
    return POLL_FAST_MS;
  }

  if (projects.some((project) => isRecentlyUpdated(project))) {
    return POLL_MS;
  }

  return null;
};

const useProjects = (options: {
  readonly shouldWatch: boolean;
}): ProjectsState & { readonly reload: () => Promise<void> } => {
  const current = useSyncExternalStore(projectsApi.subscribe, projectsApi.get);
  useEffect(() => {
    void runProjectsLoad();
  }, []);
  const { shouldWatch } = options;

  useEffect(() => {
    if (!shouldWatch || current.projects === null) {
      return;
    }

    const delay = toPollDelay(current.projects);

    if (delay === null) {
      return;
    }

    const reloadIfVisible = (): void => {
      if (document.visibilityState === "visible") {
        void runProjectsLoad();
      }
    };

    const timer = globalThis.setTimeout(reloadIfVisible, delay);
    document.addEventListener("visibilitychange", reloadIfVisible);

    return (): void => {
      globalThis.clearTimeout(timer);
      document.removeEventListener("visibilitychange", reloadIfVisible);
    };
  }, [shouldWatch, current]);

  return { ...current, reload: runProjectsLoad };
};

const HEALTH_POLL_MS = 2500;

const getHealthOrNull = async (): Promise<AppHealth[] | null> => {
  try {
    return await projectsApi.health();
  } catch {
    return null;
  }
};

const toHealthKey = (projects: Project[] | null): string => {
  const parts: string[] = [];

  for (const project of projects ?? []) {
    if (project.imported && !project.designSystemFor) {
      parts.push(`${project.id}:${project.updatedAt}`);
    }
  }

  return parts.join(",");
};

const useAppHealth = (projects: Project[] | null): Map<string, AppHealth> => {
  const [health, setHealth] = useState<AppHealth[]>([]);
  const key = toHealthKey(projects);

  useEffect(() => {
    if (!key) {
      return;
    }

    let isLive = true;
    let timer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const refresh = async (): Promise<void> => {
      const next = await getHealthOrNull();

      if (!isLive || next === null) {
        return;
      }

      setHealth(next);

      if (next.some((item) => item.state === "building")) {
        timer = globalThis.setTimeout(refresh, HEALTH_POLL_MS);
      }
    };

    refresh();

    return (): void => {
      isLive = false;

      if (timer !== null) {
        globalThis.clearTimeout(timer);
      }
    };
  }, [key]);

  return useMemo(
    () => new Map(health.map((item) => [item.projectId, item])),
    [health]
  );
};

export { projectsApi, useAppHealth, useProjects };

export type { ProjectsState };
