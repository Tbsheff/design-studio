import { useCallback, useState } from "react";

import { errorText } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import { revertHunk } from "./versions-api.js";

type HunkState =
  | { kind: "kept" }
  | { kind: "busy" }
  | { kind: "undone"; title: string }
  | { kind: "error"; message: string };

type HunkStates = Record<string, HunkState>;

interface HunkReview {
  states: HunkStates;
  keep: (key: string) => void;
  undo: (key: string, file: string, hunk: number) => void;
}

interface HunkStore {
  pair: string;
  states: HunkStates;
}

interface RevertRange {
  file: string;
  from: string;
  hunk: number;
  to: string;
}

const hunkKey = (file: string, index: number): string => `${file}#${index}`;

const revertState = async (
  projectId: string,
  directionId: string,
  range: RevertRange
): Promise<HunkState> => {
  try {
    const result = await revertHunk(projectId, directionId, range);

    return { kind: "undone", title: result.version.title };
  } catch (error: unknown) {
    return { kind: "error", message: errorText(error) };
  }
};

const withoutKey = (states: HunkStates, key: string): HunkStates =>
  Object.fromEntries(Object.entries(states).filter(([name]) => name !== key));

const statesFor = (store: HunkStore, pair: string): HunkStates => {
  if (store.pair === pair) {
    return store.states;
  }

  return {};
};

const withoutUndone = (store: HunkStore, back: string): HunkStore => {
  const hit = Object.entries(store.states).find(
    ([, state]) => state.kind === "undone" && back === `Undo: ${state.title}`
  );

  if (!hit) {
    return store;
  }

  return { ...store, states: withoutKey(store.states, hit[0]) };
};

const useHunkReview = (
  projectId: string,
  directionId: string,
  from: string,
  to: string
): HunkReview => {
  const pair = `${projectId}/${directionId}/${from}/${to}`;
  const [store, setStore] = useState<HunkStore>({ pair, states: {} });

  const update = useCallback(
    (key: string, change: (prev: HunkState | null) => HunkState | null) =>
      setStore((prev) => {
        const states = statesFor(prev, pair);
        const value = change(states[key] ?? null);

        if (!value) {
          return { pair, states: withoutKey(states, key) };
        }

        return { pair, states: { ...states, [key]: value } };
      }),
    [pair]
  );

  const keep = useCallback(
    (key: string) =>
      update(key, (prev) => {
        if (prev?.kind === "kept") {
          return null;
        }

        return { kind: "kept" };
      }),
    [update]
  );

  const undo = useCallback(
    async (key: string, file: string, hunk: number) => {
      update(key, () => ({ kind: "busy" }));

      const next = await revertState(projectId, directionId, {
        file,
        from,
        hunk,
        to,
      });

      update(key, () => next);
    },
    [projectId, directionId, from, to, update]
  );

  useProjectEvents(projectId, (event) => {
    if (
      event.type !== "version.created" ||
      event.version.directionId !== directionId
    ) {
      return;
    }

    const back = event.version.title;
    setStore((prev) => withoutUndone(prev, back));
  });

  const states = statesFor(store, pair);

  return { keep, states, undo };
};

export { hunkKey, useHunkReview };

export type { HunkReview, HunkState };
