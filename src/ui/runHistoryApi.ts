import { useSyncExternalStore } from "react";

import type { WireOutput } from "../shared/actions/_core/action.js";
import type { listRun } from "../shared/actions/run/list.js";
import { routes as runsRoutes } from "../shared/actions/run/routes.js";
import type { RunSummary } from "../shared/contracts";
import { call } from "./platform/http";

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

export async function renameRun(
  runId: string,
  title: string
): Promise<RunSummary> {
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
}

export interface RunPage {
  runs: RunSummary[];
  nextBefore: number | null;
}

export async function listRunPage(
  projectId: string,
  limit: number,
  before: number | null
): Promise<RunPage> {
  return toPage(
    await call(runsRoutes.listRun, {
      cursor: toCursor(before),
      limit,
      projectId,
    })
  );
}

export const SEARCH_LIMIT = 20;

export async function searchRunPage(
  directionId: string,
  query: string
): Promise<RunPage> {
  const ownerProjectId = history?.projectId;

  if (!ownerProjectId) {
    return { runs: [], nextBefore: null };
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
}

export function publishRunHistory(next: RunHistory | null): void {
  history = next;
}

export function runProjectId(): string {
  return history?.projectId ?? "";
}

export function loadRunsThrough(runId: string): Promise<boolean> {
  return history ? history.through(runId) : Promise.resolve(false);
}

export interface OlderRuns {
  more: boolean;
  loading: boolean;
}

const NONE: OlderRuns = { more: false, loading: false };
let older: OlderRuns = NONE;
let loader: (() => void) | null = null;
const listeners = new Set<() => void>();

export function publishOlderRuns(
  next: OlderRuns,
  load: (() => void) | null
): void {
  loader = load;

  if (next.more === older.more && next.loading === older.loading) {
    return;
  }

  older = next.more || next.loading ? next : NONE;
  listeners.forEach((listener) => listener());
}

export function requestOlderRuns(): void {
  loader?.();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useOlderRuns(): OlderRuns {
  return useSyncExternalStore(subscribe, () => older);
}
