import type { Project } from "@design-studio/contracts";
import { useEffect, useState, useSyncExternalStore } from "react";

import { api } from "../../api.js";
import type { ProjectSearchResult, RouteHit } from "./deps.js";
import { projectsApi } from "./projects-store-model.js";

interface FoundRoutes {
  readonly query: string;
  readonly routes: RouteHit[];
}

const ALL_LIMIT = 100;
const ROUTE_DELAY_MS = 90;
const ROUTE_LIMIT = 8;

interface QueuedRefresh {
  readonly current: string | null;
}

let latest: ProjectSearchResult | null = null;
let loading: Promise<void> | null = null;
let queued: QueuedRefresh | null = null;
let lastCurrent: string | null = null;
let listSignature = "";
let stopList: (() => void) | null = null;
const listeners = new Set<() => void>();

const toSignature = (projects: Project[] | null): string =>
  (projects ?? [])
    .map(
      (project) =>
        `${project.id}:${project.name}:${project.updatedAt}:${project.thumbnail?.versionId ?? ""}`
    )
    .join("|");

const getHitsOrNull = async (
  query: string,
  current: string | null,
  limit: number
): Promise<ProjectSearchResult | null> => {
  try {
    return await api.searchProjects(query, current, limit);
  } catch {
    return null;
  }
};

const runProjectHitsRefresh = (
  current: string | null,
  isFresh: boolean
): Promise<void> => {
  lastCurrent = current;

  if (loading && isFresh) {
    queued = { current };

    return loading;
  }

  const load = async (): Promise<void> => {
    const result = await getHitsOrNull("", current, ALL_LIMIT);

    if (result !== null) {
      latest = result;

      for (const listener of listeners) {
        listener();
      }
    }

    loading = null;
    const next = queued;
    queued = null;

    if (next !== null) {
      runProjectHitsRefresh(next.current, false);
    }
  };

  loading ??= load();

  return loading;
};

const runListChange = (): void => {
  const next = toSignature(projectsApi.get().projects);

  if (next === listSignature) {
    return;
  }

  listSignature = next;
  void runProjectHitsRefresh(lastCurrent, true);
};

const startHitsSubscription = (listener: () => void): (() => void) => {
  listeners.add(listener);

  if (!stopList) {
    listSignature = toSignature(projectsApi.get().projects);
    stopList = projectsApi.subscribe(runListChange);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      stopList?.();
      stopList = null;
    }
  };
};

const isOpenedMarked = async (projectId: string): Promise<boolean> => {
  try {
    await api.markProjectOpened(projectId);

    return true;
  } catch {
    return false;
  }
};

const runOpenedMark = async (projectId: string): Promise<void> => {
  await isOpenedMarked(projectId);
  await runProjectHitsRefresh(projectId, true);
};

const setProjectOpened = (projectId: string): void => {
  runOpenedMark(projectId);
};

const getLatestHits = (): ProjectSearchResult | null => latest;

const useProjectHits = (
  current: string | null,
  isRefreshing: boolean
): ProjectSearchResult | null => {
  useEffect(() => {
    if (isRefreshing) {
      void runProjectHitsRefresh(current, false);
    }
  }, [current, isRefreshing]);

  return useSyncExternalStore(startHitsSubscription, getLatestHits);
};

const runRouteSearch = async (
  text: string,
  current: string | null,
  isLive: () => boolean,
  onFound: (found: FoundRoutes) => void
): Promise<void> => {
  const result = await getHitsOrNull(text, current, ROUTE_LIMIT);

  if (result !== null && isLive()) {
    onFound({ query: text, routes: result.routes });
  }
};

const useRouteHits = (
  query: string,
  current: string | null,
  fallback: RouteHit[]
): RouteHit[] => {
  const [found, setFound] = useState<FoundRoutes | null>(null);
  const text = query.trim();
  useEffect(() => {
    if (!text) {
      return;
    }

    let isLive = true;

    const timer = globalThis.setTimeout(() => {
      runRouteSearch(text, current, () => isLive, setFound);
    }, ROUTE_DELAY_MS);

    return (): void => {
      isLive = false;
      globalThis.clearTimeout(timer);
    };
  }, [text, current]);

  if (!text) {
    return fallback;
  }

  return found?.routes ?? [];
};

export {
  setProjectOpened as noteProjectOpened,
  runProjectHitsRefresh as refreshProjectHits,
  useProjectHits,
  useRouteHits,
};
