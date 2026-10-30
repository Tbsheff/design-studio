import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ProjectSearchResult, RouteHit } from '../shared/project-search';
import { api } from './api';

const ALL_LIMIT = 100;
const ROUTE_DELAY_MS = 90;

let latest: ProjectSearchResult | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function refreshProjectHits(current: string | null): Promise<void> {
  loading ??= api
    .searchProjects('', current, ALL_LIMIT)
    .then((result) => {
      latest = result;
      for (const listener of listeners) listener();
    })
    .catch(() => undefined)
    .finally(() => {
      loading = null;
    });
  return loading;
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
