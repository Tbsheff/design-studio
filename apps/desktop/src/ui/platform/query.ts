import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import type { ActionId } from "@design-studio/actions/_core/action";
import type { ActionDone } from "@design-studio/actions/app-stream";
import { call } from "./http";
import type { ActionRoute, RouteInput, RouteOutput } from "./http";
import { subscribeActionDone } from "./stream";

interface ReadState<Route extends ActionRoute> {
  readonly data: RouteOutput<Route> | null;
  readonly error: Error | null;
  readonly loading: boolean;
  readonly refetch: () => Promise<void>;
}

interface WriteState<Route extends ActionRoute> {
  readonly error: Error | null;
  readonly pending: boolean;
  readonly run: (
    input: RouteInput<Route>
  ) => Promise<RouteOutput<Route> | null>;
}

type ActionState<Route extends ActionRoute> = ReadState<Route> &
  WriteState<Route>;

type DoneListener = (done: ActionDone) => void;

interface Snapshot<Route extends ActionRoute> {
  readonly data: RouteOutput<Route> | null;
  readonly error: Error | null;
  readonly key: string;
}

const idle = (): null => null;

const inflight = new Map<string, Promise<unknown>>();

const listeners = new Set<DoneListener>();

let unsubscribe: (() => void) | null = null;

const settle = async (key: string, value: Promise<unknown>): Promise<void> => {
  try {
    await value;
  } catch {
    inflight.delete(key);
  }

  if (inflight.get(key) === value) {
    inflight.delete(key);
  }
};

const readShared = async <Out>(
  key: string,
  load: () => Promise<Out>
): Promise<Out> => {
  const hit = inflight.get(key);

  if (hit) {
    return (await hit) as Out;
  }

  const next = load();

  inflight.set(key, next);
  settle(key, next);

  return next;
};

const prefetch = async <Out>(
  key: string,
  load: () => Promise<Out>
): Promise<void> => {
  try {
    await readShared(key, load);
  } catch {
    inflight.delete(key);
  }
};

const notify = (done: ActionDone): void => {
  inflight.clear();

  for (const listener of listeners) {
    listener(done);
  }
};

const parseDone = (raw: string): ActionDone | null => {
  try {
    return JSON.parse(raw) as ActionDone;
  } catch {
    return null;
  }
};

const openSource = (): void => {
  if (unsubscribe) {
    return;
  }

  unsubscribe = subscribeActionDone((raw) => {
    const done = parseDone(raw);

    if (done) {
      notify(done);
    }
  });
};

const subscribeDone = (listener: DoneListener): (() => void) => {
  openSource();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      unsubscribe?.();
      unsubscribe = null;
    }
  };
};

const includesId = (done: ActionDone, id: ActionId): boolean =>
  done.actionId === id || done.invalidates.includes(id);

const snapshotOf = <Route extends ActionRoute>(
  data: RouteOutput<Route> | null,
  error: Error | null,
  key: string
): Snapshot<Route> => ({ data, error, key });

const useRead = <Route extends ActionRoute>(
  action: Route,
  input: RouteInput<Route> | null
): ReadState<Route> => {
  const key = JSON.stringify([action.id, input]);
  const [snapshot, setSnapshot] = useState<Snapshot<Route> | null>(null);
  const live = useRef(true);
  const reads = input !== null;

  const refetch = useCallback(async (): Promise<void> => {
    const [, current] = JSON.parse(key) as [ActionId, RouteInput<Route> | null];

    if (current === null) {
      return;
    }

    try {
      const data = await readShared(key, () => call(action, current));

      if (live.current) {
        setSnapshot(snapshotOf<Route>(data, null, key));
      }
    } catch (error) {
      if (live.current) {
        setSnapshot(snapshotOf<Route>(null, error as Error, key));
      }
    }
  }, [action, key]);

  useEffect(() => {
    live.current = true;
    queueMicrotask(refetch);

    return (): void => {
      live.current = false;
    };
  }, [refetch]);

  useEffect(() => {
    if (!reads) {
      return idle;
    }

    return subscribeDone((done): void => {
      if (includesId(done, action.id)) {
        refetch();
      }
    });
  }, [action, reads, refetch]);

  const current = snapshot?.key === key;
  const data = (current && snapshot?.data) || null;
  const error = (current && snapshot?.error) || null;
  const loading = reads && !current;

  return { data, error, loading, refetch };
};

const useWrite = <Route extends ActionRoute>(
  action: Route
): WriteState<Route> => {
  const [failed, setFailed] = useState<Error | null>(null);
  const [pending, startTransition] = useTransition();

  const send = useCallback(
    async (body: RouteInput<Route>): Promise<RouteOutput<Route> | null> => {
      try {
        const out = await call(action, body);

        setFailed(null);
        notify({
          actionId: action.id,
          invalidates: [...action.invalidates],
          projectId: null,
        });

        return out;
      } catch (error) {
        setFailed(error as Error);

        return null;
      }
    },
    [action]
  );

  const run = useCallback(
    (body: RouteInput<Route>): Promise<RouteOutput<Route> | null> => {
      const task = send(body);

      startTransition(async () => {
        await task;
      });

      return task;
    },
    [send]
  );

  const error = failed;

  return { error, pending, run };
};

const useAction = <Route extends ActionRoute>(
  action: Route,
  input: RouteInput<Route> | null = null
): ActionState<Route> => {
  const read = useRead(action, input);
  const write = useWrite(action);

  return {
    data: read.data,
    error: write.error ?? read.error,
    loading: read.loading,
    pending: write.pending,
    refetch: read.refetch,
    run: write.run,
  };
};

export { prefetch, readShared, subscribeDone, useAction };

export type { ActionState, ReadState, WriteState };
