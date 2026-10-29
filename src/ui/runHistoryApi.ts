import { useSyncExternalStore } from 'react';
import type { RunSummary } from '../shared/contracts';
import { json } from './api';

export function renameRun(runId: string, title: string): Promise<RunSummary> {
  return json<RunSummary>('PATCH', `/api/runs/${encodeURIComponent(runId)}`, { title });
}

export interface RunPage {
  runs: RunSummary[];
  nextBefore: number | null;
}

export function listRunPage(projectId: string, limit: number, before: number | null): Promise<RunPage> {
  const after = before === null ? '' : `&before=${before}`;
  return json<RunPage>('GET', `/api/projects/${encodeURIComponent(projectId)}/runs?limit=${limit}${after}`);
}

export interface OlderRuns {
  more: boolean;
  loading: boolean;
}

const NONE: OlderRuns = { more: false, loading: false };
let older: OlderRuns = NONE;
let loader: (() => void) | null = null;
const listeners = new Set<() => void>();

export function publishOlderRuns(next: OlderRuns, load: (() => void) | null): void {
  loader = load;
  if (next.more === older.more && next.loading === older.loading) return;
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
