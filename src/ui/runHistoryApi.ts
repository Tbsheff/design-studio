import { useSyncExternalStore } from "react";

import { routes as runsRoutes } from "../shared/actions/run/routes.js";
import type { RunSummary } from "../shared/contracts";
import { call } from "./platform/http";

interface PageBody {
  readonly nextBefore: number | null;
  readonly runs: readonly RunWire[];
}

type RunWire = RunSummary | { readonly id: string };

const isRunSummary = (value: RunWire): value is RunSummary =>
  "id" in value && "status" in value && "request" in value;

const toPage = (body: PageBody): RunPage => ({
  nextBefore: body.nextBefore,
  runs: body.runs.filter(isRunSummary),
});

export async function renameRun(
  runId: string,
  title: string
): Promise<RunSummary> {
  const renamed = await call(runsRoutes.renameRun, { runId, title });

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
  if (before === null) {
    return toPage(await call(runsRoutes.listRun, { limit, projectId }));
  }

  return toPage(await call(runsRoutes.listRun, { before, limit, projectId }));
}

export const SEARCH_LIMIT = 20;

export async function searchRunPage(
  directionId: string,
  query: string
): Promise<RunPage> {
  const projectId = history?.projectId;

  if (!projectId) {
    return { runs: [], nextBefore: null };
  }

  return toPage(
    await call(runsRoutes.listRun, {
      direction: directionId,
      limit: SEARCH_LIMIT,
      light: "1",
      q: query,
      projectId,
    })
  );
}

interface RunHistory {
  projectId: string;
  through: (runId: string) => Promise<boolean>;
}

let history: RunHistory | null = null;

export function publishRunHistory(next: RunHistory | null): void {
  history = next;
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
