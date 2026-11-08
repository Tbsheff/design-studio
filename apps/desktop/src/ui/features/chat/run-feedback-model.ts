import { useCallback, useState } from "react";

import { readStored, writeStored } from "../../platform/storage.js";

type Thumb = "up" | "down";

interface RunFeedback {
  thumb: Thumb | null;
  stars: number;
}

const KEY = "design-studio.run-feedback.v1";
const MAX_ENTRIES = 500;
const EMPTY: RunFeedback = { stars: 0, thumb: null };

type Store = Record<string, RunFeedback & { at: number }>;

let cache: Store | null = null;

const load = (): Store => {
  if (cache) {
    return cache;
  }

  try {
    const raw = readStored(KEY);
    let parsed: unknown = {};

    if (raw) {
      parsed = JSON.parse(raw);
    }

    cache = parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    cache = {};
  }

  return cache;
};

const save = (store: Store): void => {
  const ids = Object.keys(store);

  if (ids.length > MAX_ENTRIES) {
    ids
      .toSorted(
        (entry, right) => (store[entry]?.at ?? 0) - (store[right]?.at ?? 0)
      )
      .slice(0, ids.length - MAX_ENTRIES)
      .forEach((id) => delete store[id]);
  }

  writeStored(KEY, JSON.stringify(store));
};

const readRunFeedback = (runId: string): RunFeedback => {
  const entry = load()[runId];

  if (entry) {
    return { stars: entry.stars ?? 0, thumb: entry.thumb ?? null };
  }

  return EMPTY;
};

const writeRunFeedback = (runId: string, feedback: RunFeedback): void => {
  const store = { ...load() };

  if (feedback.thumb === null && feedback.stars === 0) {
    delete store[runId];
  } else {
    store[runId] = { ...feedback, at: Date.now() };
  }

  cache = store;
  save(store);
};

const useRunFeedback = (
  runId: string
): [RunFeedback, (patch: Partial<RunFeedback>) => void] => {
  const [feedback, setFeedback] = useState(() => readRunFeedback(runId));

  const update = useCallback(
    (patch: Partial<RunFeedback>) =>
      setFeedback((prev) => {
        const next = { ...prev, ...patch };
        writeRunFeedback(runId, next);

        return next;
      }),
    [runId]
  );

  return [feedback, update];
};

export { readRunFeedback, useRunFeedback, writeRunFeedback };

export type { RunFeedback, Thumb };
