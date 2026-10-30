import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Project } from '../shared/contracts';
import type { AppHealth, FoundApps } from '../shared/found-apps';
import { api, errorText, json } from './api';
import { thumbnailPending } from './projectList';

export interface ProjectsState {
  projects: Project[] | null;
  error: string | null;
}

let state: ProjectsState = { projects: null, error: null };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: ProjectsState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function load(): Promise<void> {
  inflight ??= api
    .listProjects()
    .then((projects) => emit({ projects, error: null }))
    .catch((err: unknown) => emit({ ...state, error: errorText(err) }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function update(change: (list: Project[]) => Project[]): void {
  if (state.projects) emit({ ...state, projects: change(state.projects) });
}

export const projectsApi = {
  get: () => state,
  load,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  update,
  rename: async (project: Project, name: string) => {
    update((list) => list.map((item) => (item.id === project.id ? { ...item, name } : item)));
    try {
      return await api.renameProject(project.id, name);
    } finally {
      void load();
    }
  },
  duplicate: async (project: Project) => {
    const { project: copy } = await api.duplicateProject(project.id);
    await load();
    return copy;
  },
  trash: async (project: Project) => {
    update((list) => list.filter((item) => item.id !== project.id));
    try {
      return await api.trashProject(project.id);
    } finally {
      void load();
    }
  },
  restore: async (trashId: string) => {
    await api.restoreProject(trashId);
    await load();
  },
  reveal: (project: Project) => json<{ ok: true }>('POST', `/api/projects/${encodeURIComponent(project.id)}/reveal`),
  health: () => json<AppHealth[]>('GET', '/api/home/health'),
  found: (fresh = false) => json<FoundApps>('GET', `/api/folders/found${fresh ? '?fresh=1' : ''}`),
};

const POLL_FAST_MS = 500;
const POLL_MS = 1500;
const RECENT_MS = 120_000;

export function useProjects(options: { watch?: boolean } = {}): ProjectsState & { reload: () => Promise<void> } {
  const current = useSyncExternalStore(projectsApi.subscribe, projectsApi.get);
  useEffect(() => {
    void load();
  }, []);
  const projects = current.projects;
  const lagging = projects?.some(thumbnailPending) ?? false;
  const watching = options.watch === true && (lagging || (projects?.some((project) => Date.now() - project.updatedAt < RECENT_MS) ?? false));
  useEffect(() => {
    if (!watching) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, lagging ? POLL_FAST_MS : POLL_MS);
    return () => window.clearInterval(timer);
  }, [watching, lagging]);
  return { ...current, reload: load };
}

const HEALTH_POLL_MS = 2500;

export function useAppHealth(projects: Project[] | null): Map<string, AppHealth> {
  const [health, setHealth] = useState<AppHealth[]>([]);
  const [tick, setTick] = useState(0);
  const key = (projects ?? [])
    .filter((project) => project.imported && !project.designSystemFor)
    .map((project) => `${project.id}:${project.updatedAt}`)
    .join(',');
  useEffect(() => {
    if (!key) return;
    let live = true;
    projectsApi
      .health()
      .then((next) => live && setHealth(next))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key, tick]);
  const building = health.some((item) => item.state === 'building');
  useEffect(() => {
    if (!building) return;
    const timer = window.setTimeout(() => setTick((n) => n + 1), HEALTH_POLL_MS);
    return () => window.clearTimeout(timer);
  }, [building, health]);
  return useMemo(() => new Map(health.map((item) => [item.projectId, item])), [health]);
}
