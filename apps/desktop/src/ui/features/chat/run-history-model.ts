import type { WireOutput } from "@design-studio/actions/_core/action";
import type { listRun } from "@design-studio/actions/run/list";
import { routes as runsRoutes } from "@design-studio/actions/run/routes";
import type { RunSummary } from "@design-studio/contracts";
import { useSyncExternalStore } from "react";

import { call } from "../../platform/http.js";

interface RunHistory {
  projectId: string;
  through: (runId: string) => Promise<boolean>;
}

let history: RunHistory | null = null;

type PageBody = WireOutput<typeof listRun>;

type RunWire = PageBody["items"][number];

const isRunSummary = (value: RunWire): value is RunSummary =>
  "request" in value;

const toNextBefore = (next: string | null): number | null => {
  if (next === null) {
    return null;
  }

  return Number(next);
};

const toCursor = (before: number | null): string | null => {
  if (before === null) {
    return null;
  }

  return String(before);
};

const toPage = (body: PageBody): RunPage => ({
  nextBefore: toNextBefore(body.next),
  runs: body.items.filter(isRunSummary),
});

export const renameRun = async (
  runId: string,
  title: string
): Promise<RunSummary> => {
  const projectId = history?.projectId;

  if (!projectId) {
    throw new Error("Open a project to rename its runs.");
  }

  const renamed = await call(runsRoutes.renameRun, {
    projectId,
    runId,
    title,
  });

  if (!isRunSummary(renamed)) {
    throw new Error("The studio returned a run without a request.");
  }

  return renamed;
};

export interface RunPage {
  runs: RunSummary[];
  nextBefore: number | null;
}

export const listRunPage = async (
  projectId: string,
  limit: number,
  before: number | null
): Promise<RunPage> =>
  toPage(
    await call(runsRoutes.listRun, {
      cursor: toCursor(before),
      limit,
      projectId,
    })
  );

export const SEARCH_LIMIT = 20;

export const searchRunPage = async (
  directionId: string,
  query: string
): Promise<RunPage> => {
  const ownerProjectId = history?.projectId;

  if (!ownerProjectId) {
    return { nextBefore: null, runs: [] };
  }

  return toPage(
    await call(runsRoutes.listRun, {
      cursor: null,
      direction: directionId,
      light: true,
      limit: SEARCH_LIMIT,
      projectId: ownerProjectId,
      q: query,
    })
  );
};

export const publishRunHistory = (next: RunHistory | null): void => {
  history = next;
};

export const runProjectId = (): string => history?.projectId ?? "";

export const loadRunsThrough = (runId: string): Promise<boolean> =>
  history ? history.through(runId) : Promise.resolve(false);

export interface OlderRuns {
  more: boolean;
  loading: boolean;
}

const NONE: OlderRuns = { loading: false, more: false };
let older: OlderRuns = NONE;
let loader: (() => void) | null = null;
const listeners = new Set<() => void>();

export const publishOlderRuns = (
  next: OlderRuns,
  load: (() => void) | null
): void => {
  loader = load;

  if (next.more === older.more && next.loading === older.loading) {
    return;
  }

  older = next.more || next.loading ? next : NONE;
  listeners.forEach((listener) => listener());
};

export const requestOlderRuns = (): void => {
  loader?.();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useOlderRuns = (): OlderRuns =>
  useSyncExternalStore(subscribe, () => older);
