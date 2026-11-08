import type { Project } from "@design-studio/contracts";
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

function emit(next: ProjectsState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function load(): Promise<void> {
  inflight ??= api
    .listProjects()
    .then((projects) => emit({ error: null, projects }))
    .catch((error: unknown) => emit({ ...state, error: errorText(error) }))
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

function update(change: (list: Project[]) => Project[]): void {
  if (state.projects) {
    emit({ ...state, projects: change(state.projects) });
  }
}

const projectsApi = {
  duplicate: async (project: Project) => {
    const { project: copy } = await api.duplicateProject(project.id);
    await load();

    return copy;
  },
  found: (fresh = false) =>
    json<FoundApps>("GET", `/api/folders/found${fresh ? "?fresh=1" : ""}`),
  get: () => state,
  health: () => json<AppHealth[]>("GET", "/api/home/health"),
  load,
  rename: async (project: Project, name: string) => {
    update((list) =>
      list.map((item) => (item.id === project.id ? { ...item, name } : item))
    );

    try {
      return await api.renameProject(project.id, name);
    } finally {
      void load();
    }
  },
  restore: async (trashId: string) => {
    await api.restoreProject(trashId);
    await load();
  },
  reveal: (project: Project) =>
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
  trash: async (project: Project) => {
    update((list) => list.filter((item) => item.id !== project.id));

    try {
      return await api.trashProject(project.id);
    } finally {
      void load();
    }
  },
  update,
};

const POLL_FAST_MS = 500;
const POLL_MS = 1500;
const RECENT_MS = 120_000;

const useProjects = (options: {
  readonly shouldWatch: boolean;
}): ProjectsState & { readonly reload: () => Promise<void> } => {
  const current = useSyncExternalStore(projectsApi.subscribe, projectsApi.get);
  useEffect(() => {
    void load();
  }, []);
  const { projects } = current;
  const lagging = projects?.some(isThumbnailPending) ?? false;

  const watching =
    options.shouldWatch === true &&
    (lagging ||
      (projects?.some(
        (project) => Date.now() - project.updatedAt < RECENT_MS
      ) ??
        false));

  useEffect(() => {
    if (!watching) {
      return;
    }

    const timer = globalThis.setInterval(
      () => {
        if (document.visibilityState === "visible") {
          void load();
        }
      },
      lagging ? POLL_FAST_MS : POLL_MS
    );

    return (): void => globalThis.clearInterval(timer);
  }, [watching, lagging]);

  return { ...current, reload: load };
};

const HEALTH_POLL_MS = 2500;

const useAppHealth = (projects: Project[] | null): Map<string, AppHealth> => {
  const [health, setHealth] = useState<AppHealth[]>([]);
  const [tick, setTick] = useState(0);

  const key = (projects ?? [])
    .filter((project) => project.imported && !project.designSystemFor)
    .map((project) => `${project.id}:${project.updatedAt}`)
    .join(",");

  useEffect(() => {
    if (!key) {
      return;
    }

    let live = true;
    projectsApi
      .health()
      .then((next) => live && setHealth(next))
      .catch(() => null);

    return (): void => {
      live = false;
    };
  }, [key, tick]);
  const building = health.some((item) => item.state === "building");
  useEffect(() => {
    if (!building) {
      return;
    }

    const timer = globalThis.setTimeout(
      () => setTick((count) => count + 1),
      HEALTH_POLL_MS
    );

    return (): void => globalThis.clearTimeout(timer);
  }, [building, health]);

  return useMemo(
    () => new Map(health.map((item) => [item.projectId, item])),
    [health]
  );
};

export { projectsApi, useAppHealth, useProjects };

export type { ProjectsState };
