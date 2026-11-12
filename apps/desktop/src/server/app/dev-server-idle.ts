import type { StudioEvent } from "@design-studio/contracts";

import type { EventBus } from "../events/index.js";

const MINUTE_MS = 60_000;
const APP_IDLE_STOP_MINUTES = 10;
const APP_IDLE_STOP_MS = APP_IDLE_STOP_MINUTES * MINUTE_MS;

interface IdleEntry {
  usedAt: number;
  sockets: number;
  timer: NodeJS.Timeout | null;
  readonly runs: Set<string>;
  readonly unsubscribe: () => void;
}

interface IdleState {
  readonly bus: EventBus;
  readonly entries: Map<string, IdleEntry>;
  readonly onIdle: (projectId: string) => void;
}

interface IdleStop {
  readonly forget: (projectId: string) => void;
  readonly holdSocket: (projectId: string) => () => void;
  readonly markUsed: (projectId: string) => void;
}

const toRunTracker =
  (runs: Set<string>) =>
  (event: StudioEvent): void => {
    if (event.type === "run.started") {
      runs.add(event.runId);

      return;
    }

    if (event.type === "run.finished") {
      runs.delete(event.runId);
    }
  };

const toEntry = (state: IdleState, projectId: string): IdleEntry => {
  const found = state.entries.get(projectId);

  if (found) {
    return found;
  }

  const runs = new Set<string>();

  const entry: IdleEntry = {
    runs,
    sockets: 0,
    timer: null,
    unsubscribe: state.bus.subscribe(projectId, toRunTracker(runs)),
    usedAt: Date.now(),
  };

  state.entries.set(projectId, entry);

  return entry;
};

const deleteEntry = (state: IdleState, projectId: string): void => {
  const entry = state.entries.get(projectId);

  if (!entry) {
    return;
  }

  if (entry.timer) {
    clearTimeout(entry.timer);
  }

  entry.unsubscribe();
  state.entries.delete(projectId);
};

const toNextDelay = (entry: IdleEntry): number | null => {
  if (entry.runs.size > 0 || entry.sockets > 0) {
    return APP_IDLE_STOP_MS;
  }

  const leftMs = entry.usedAt + APP_IDLE_STOP_MS - Date.now();

  if (leftMs > 0) {
    return leftMs;
  }

  return null;
};

const setCheck = (
  state: IdleState,
  projectId: string,
  entry: IdleEntry,
  delayMs: number
): void => {
  entry.timer = setTimeout(() => {
    entry.timer = null;

    if (state.entries.get(projectId) !== entry) {
      return;
    }

    const next = toNextDelay(entry);

    if (next === null) {
      deleteEntry(state, projectId);
      state.onIdle(projectId);
    } else {
      setCheck(state, projectId, entry, next);
    }
  }, delayMs);
  entry.timer.unref();
};

const setEntryUsed = (state: IdleState, projectId: string): IdleEntry => {
  const entry = toEntry(state, projectId);
  entry.usedAt = Date.now();

  if (!entry.timer) {
    setCheck(state, projectId, entry, APP_IDLE_STOP_MS);
  }

  return entry;
};

const toSocketHold = (state: IdleState, projectId: string): (() => void) => {
  const entry = setEntryUsed(state, projectId);
  entry.sockets += 1;
  let isHeld = true;

  return () => {
    if (isHeld) {
      isHeld = false;
      entry.sockets -= 1;
      entry.usedAt = Date.now();
    }
  };
};

const createIdleStop = (
  bus: EventBus,
  onIdle: (projectId: string) => void
): IdleStop => {
  const entries = new Map<string, IdleEntry>();
  const state: IdleState = { bus, entries, onIdle };

  return {
    forget: (projectId) => deleteEntry(state, projectId),
    holdSocket: (projectId) => toSocketHold(state, projectId),
    markUsed: (projectId) => {
      setEntryUsed(state, projectId);
    },
  };
};

export { APP_IDLE_STOP_MINUTES, createIdleStop };

export type { IdleStop };
