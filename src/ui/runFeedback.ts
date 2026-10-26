import { useCallback, useState } from 'react';

export type Thumb = 'up' | 'down';

export interface RunFeedback {
  thumb: Thumb | null;
  stars: number;
}

const KEY = 'design-studio.run-feedback.v1';
const MAX_ENTRIES = 500;
const EMPTY: RunFeedback = { thumb: null, stars: 0 };

type Store = Record<string, RunFeedback & { at: number }>;

let cache: Store | null = null;

function load(): Store {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    cache = parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function save(store: Store): void {
  const ids = Object.keys(store);
  if (ids.length > MAX_ENTRIES) {
    ids
      .sort((a, b) => (store[a]?.at ?? 0) - (store[b]?.at ?? 0))
      .slice(0, ids.length - MAX_ENTRIES)
      .forEach((id) => delete store[id]);
  }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    return;
  }
}

export function readRunFeedback(runId: string): RunFeedback {
  const entry = load()[runId];
  return entry ? { thumb: entry.thumb ?? null, stars: entry.stars ?? 0 } : EMPTY;
}

export function writeRunFeedback(runId: string, feedback: RunFeedback): void {
  const store = { ...load() };
  if (feedback.thumb === null && feedback.stars === 0) delete store[runId];
  else store[runId] = { ...feedback, at: Date.now() };
  cache = store;
  save(store);
}

export function useRunFeedback(runId: string): [RunFeedback, (patch: Partial<RunFeedback>) => void] {
  const [feedback, setFeedback] = useState(() => readRunFeedback(runId));
  const update = useCallback(
    (patch: Partial<RunFeedback>) =>
      setFeedback((prev) => {
        const next = { ...prev, ...patch };
        writeRunFeedback(runId, next);
        return next;
      }),
    [runId],
  );
  return [feedback, update];
}
