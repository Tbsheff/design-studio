import type { Project } from "@design-studio/contracts";
import { useEffect, useState, useSyncExternalStore } from "react";

import { api } from "../../api.js";
import type { ProjectSearchResult, RouteHit } from "./deps.js";
import { projectsApi } from "./projects-store-model.js";

const ALL_LIMIT = 100;
const ROUTE_DELAY_MS = 90;

let latest: ProjectSearchResult | null = null;
let loading: Promise<void> | null = null;
let again: string | null | undefined;
let lastCurrent: string | null = null;
let listSignature = "";
let stopList: (() => void) | null = null;
const listeners = new Set<() => void>();

function signatureOf(projects: Project[] | null): string {
  return (projects ?? [])
    .map(
      (project) =>
        `${project.id}:${project.name}:${project.updatedAt}:${project.thumbnail?.versionId ?? ""}`
    )
    .join("|");
}

function onListChange(): void {
  const next = signatureOf(projectsApi.get().projects);

  if (next === listSignature) {
    return;
  }

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

const runProjectHits = async (current: string | null): Promise<void> => {
  try {
    latest = await api.searchProjects("", current, ALL_LIMIT);

    for (const listener of listeners) {
      listener();
    }
  } catch {
    return;
  } finally {
    loading = null;
    const next = again;
    again = undefined;

    if (next !== undefined) {
      refreshProjectHits(next);
    }
  }
};

const refreshProjectHits = (
  current: string | null,
  fresh = false
): Promise<void> => {
  lastCurrent = current;

  if (loading && fresh) {
    again = current;

    return loading;
  }

  loading ??= runProjectHits(current);

  return loading;
};

const noteProjectOpened = (projectId: string): void => {
  const mark = async (): Promise<void> => {
    try {
      await api.markProjectOpened(projectId);
    } catch {
      return;
    } finally {
      await refreshProjectHits(projectId, true);
    }
  };

  mark();
};

const useProjectHits = (
  current: string | null,
  refresh = true
): ProjectSearchResult | null => {
  useEffect(() => {
    if (refresh) {
      void refreshProjectHits(current);
    }
  }, [current, refresh]);

  return useSyncExternalStore(subscribe, () => latest);
};

const useRouteHits = (
  query: string,
  current: string | null,
  fallback: RouteHit[]
): RouteHit[] => {
  const [found, setFound] = useState<{
    readonly query: string;
    readonly routes: RouteHit[];
  } | null>(null);

  const text = query.trim();
  useEffect(() => {
    if (!text) {
      return;
    }

    let live = true;

    const timer = globalThis.setTimeout(() => {
      const search = async (): Promise<void> => {
        try {
          const result = await api.searchProjects(text, current, 8);

          if (live) {
            setFound({ query: text, routes: result.routes });
          }
        } catch {
          return;
        }
      };

      search();
    }, ROUTE_DELAY_MS);

    return (): void => {
      live = false;
      globalThis.clearTimeout(timer);
    };
  }, [text, current]);

  if (!text) {
    return fallback;
  }

  return found?.routes ?? [];
};

export { noteProjectOpened, refreshProjectHits, useProjectHits, useRouteHits };
