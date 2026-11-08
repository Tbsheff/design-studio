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

interface StoredFeedback extends RunFeedback {
  at: number;
}

type Store = Map<string, StoredFeedback>;

let cache: Store | null = null;

const toStore = (raw: string | null): Store => {
  const store: Store = new Map();

  if (!raw) {
    return store;
  }

  const parsed: Record<string, StoredFeedback> | null = JSON.parse(raw);

  for (const [id, entry] of Object.entries(parsed ?? {})) {
    store.set(id, entry);
  }

  return store;
};

const load = (): Store => {
  if (cache) {
    return cache;
  }

  try {
    cache = toStore(readStored(KEY));
  } catch {
    cache = new Map();
  }

  return cache;
};

const save = (store: Store): void => {
  if (store.size > MAX_ENTRIES) {
    const oldest = [...store.entries()]
      .toSorted((entry, right) => entry[1].at - right[1].at)
      .slice(0, store.size - MAX_ENTRIES);

    for (const [id] of oldest) {
      store.delete(id);
    }
  }

  writeStored(KEY, JSON.stringify(Object.fromEntries(store)));
};

const readRunFeedback = (runId: string): RunFeedback => {
  const entry = load().get(runId);

  if (entry) {
    return { stars: entry.stars ?? 0, thumb: entry.thumb ?? null };
  }

  return EMPTY;
};

const writeRunFeedback = (runId: string, feedback: RunFeedback): void => {
  const store = new Map(load());

  if (feedback.thumb === null && feedback.stars === 0) {
    store.delete(runId);
  } else {
    store.set(runId, { ...feedback, at: Date.now() });
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
