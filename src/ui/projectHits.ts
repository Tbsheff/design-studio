import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Project } from '../shared/contracts';
import type { ProjectSearchResult, RouteHit } from '../shared/project-search';
import { api } from './api';
import { projectsApi } from './projectsStore';

const ALL_LIMIT = 100;
const ROUTE_DELAY_MS = 90;

let latest: ProjectSearchResult | null = null;
let loading: Promise<void> | null = null;
let again: string | null | undefined;
let lastCurrent: string | null = null;
let listSignature = '';
let stopList: (() => void) | null = null;
const listeners = new Set<() => void>();

function signatureOf(projects: Project[] | null): string {
  return (projects ?? []).map((project) => `${project.id}:${project.name}:${project.updatedAt}:${project.thumbnail?.versionId ?? ''}`).join('|');
}

function onListChange(): void {
  const next = signatureOf(projectsApi.get().projects);
  if (next === listSignature) return;
  listSignature = next;
  void refreshProjectHits(lastCurrent, true);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!stopList) {
    listSignature = signatureOf(projectsApi.get().projects);
    stopList = projectsApi.subscribe(onListChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopList?.();
      stopList = null;
    }
  };
}

export function refreshProjectHits(current: string | null, fresh = false): Promise<void> {
  lastCurrent = current;
  if (loading && fresh) {
    again = current;
    return loading;
  }
  loading ??= api
    .searchProjects('', current, ALL_LIMIT)
    .then((result) => {
      latest = result;
      for (const listener of listeners) listener();
    })
    .catch(() => undefined)
    .finally(() => {
      loading = null;
      const next = again;
      again = undefined;
      if (next !== undefined) void refreshProjectHits(next);
    });
  return loading;
}

export function noteProjectOpened(projectId: string): void {
  void api
    .markProjectOpened(projectId)
    .catch(() => undefined)
    .then(() => refreshProjectHits(projectId, true));
}

export function useProjectHits(current: string | null): ProjectSearchResult | null {
  useEffect(() => {
    void refreshProjectHits(current);
  }, [current]);
  return useSyncExternalStore(subscribe, () => latest);
}

export function useRouteHits(query: string, current: string | null, fallback: RouteHit[]): RouteHit[] {
  const [found, setFound] = useState<{ query: string; routes: RouteHit[] } | null>(null);
  const text = query.trim();
  useEffect(() => {
    if (!text) return;
    let live = true;
    const timer = window.setTimeout(() => {
      api
        .searchProjects(text, current, 8)
        .then((result) => live && setFound({ query: text, routes: result.routes }))
        .catch(() => undefined);
    }, ROUTE_DELAY_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [text, current]);
  if (!text) return fallback;
  return found?.routes ?? [];
}
