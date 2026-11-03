import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import type {
  ActionId,
  AnyAction,
  WireInput,
  WireOutput,
} from "../../shared/actions/_core/action.js";
import type { ActionDone } from "../../shared/actions/app-stream.js";
import { APP_STREAM_PATH } from "../../shared/app-stream";
import { call } from "./http";
import type { RouteOf } from "./http";
import { getSession } from "./session";

interface Entry {
  readonly at: number;
  readonly value: Promise<unknown>;
  readonly warm: boolean;
}

interface ReadState<Action extends AnyAction> {
  readonly data: WireOutput<Action> | null;
  readonly error: Error | null;
  readonly loading: boolean;
  readonly refetch: () => Promise<void>;
}

interface WriteState<Action extends AnyAction> {
  readonly error: Error | null;
  readonly pending: boolean;
  readonly run: (
    input: WireInput<Action>
  ) => Promise<WireOutput<Action> | null>;
}

type ActionState<Action extends AnyAction> = ReadState<Action> &
  WriteState<Action>;

type DoneListener = (done: ActionDone) => void;

const ACTION_DONE_EVENT = "action.done";

const WARM_MS = 4000;

const entries = new Map<string, Entry>();

const listeners = new Set<DoneListener>();

let source: EventSource | null = null;

const dropEntry = (key: string, value: Promise<unknown>): void => {
  if (entries.get(key)?.value === value) {
    entries.delete(key);
  }
};

const track = async (
  key: string,
  value: Promise<unknown>,
  warm: boolean
): Promise<void> => {
  try {
    await value;

    if (!warm) {
      dropEntry(key, value);
    }
  } catch {
    dropEntry(key, value);
  }
};

const store = (key: string, value: Promise<unknown>, warm: boolean): void => {
  void track(key, value, warm);
  entries.set(key, { at: Date.now(), value, warm });
};

const prefetch = <Out>(key: string, load: () => Promise<Out>): void => {
  const hit = entries.get(key);

  if (hit && Date.now() - hit.at < WARM_MS) {
    return;
  }

  store(key, load(), true);
};

const readShared = async <Out>(
  key: string,
  load: () => Promise<Out>
): Promise<Out> => {
  const hit = entries.get(key);

  if (hit && (!hit.warm || Date.now() - hit.at < WARM_MS)) {
    if (hit.warm) {
      entries.delete(key);
    }

    try {
      return (await hit.value) as Out;
    } catch {
      return readShared(key, load);
    }
  }

  const next = load();

  store(key, next, false);

  return next;
};

const notify = (done: ActionDone): void => {
  entries.clear();

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
  if (source || typeof EventSource === "undefined") {
    return;
  }

  const url = `${APP_STREAM_PATH}?token=${encodeURIComponent(getSession().token)}`;
  const next = new EventSource(url);

  next.addEventListener(ACTION_DONE_EVENT, (event) => {
    const done = parseDone((event as MessageEvent<string>).data);

    if (done) {
      notify(done);
    }
  });

  source = next;
};

const subscribeDone = (listener: DoneListener): (() => void) => {
  openSource();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      source?.close();
      source = null;
    }
  };
};

const includesId = (done: ActionDone, id: ActionId): boolean =>
  done.actionId === id || done.invalidates.includes(id);

const idle = (): null => null;

const useRead = <Action extends AnyAction>(
  action: RouteOf<Action>,
  input: WireInput<Action> | null
): ReadState<Action> => {
  const [data, setData] = useState<WireOutput<Action> | null>(null);
  const [failed, setFailed] = useState<Error | null>(null);
  const [loading, setLoading] = useState(input !== null);
  const live = useRef(true);
  const key = JSON.stringify([action.id, input]);
  const reads = input !== null;

  const refetch = useCallback(async (): Promise<void> => {
    const [, current] = JSON.parse(key) as [ActionId, WireInput<Action> | null];

    if (current === null) {
      return;
    }

    try {
      const next = await readShared(key, () => call(action, current));

      if (live.current) {
        setData(next);
        setFailed(null);
      }
    } catch (error) {
      if (live.current) {
        setFailed(error as Error);
      }
    }

    if (live.current) {
      setLoading(false);
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
        void refetch();
      }
    });
  }, [action, reads, refetch]);

  const error = failed;

  return { data, error, loading, refetch };
};

const useWrite = <Action extends AnyAction>(
  action: RouteOf<Action>
): WriteState<Action> => {
  const [failed, setFailed] = useState<Error | null>(null);
  const [pending, startTransition] = useTransition();

  const send = useCallback(
    async (body: WireInput<Action>): Promise<WireOutput<Action> | null> => {
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
    (body: WireInput<Action>): Promise<WireOutput<Action> | null> => {
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

const useAction = <Action extends AnyAction>(
  action: RouteOf<Action>,
  input: WireInput<Action> | null = null
): ActionState<Action> => {
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
