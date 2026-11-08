import type { QueuedMessage } from "@design-studio/contracts";
import { useEffect, useMemo, useRef, useState, startTransition } from "react";
import type { Dispatch, SetStateAction } from "react";

import { api } from "../../api.js";
import { pick } from "../../platform/pick.js";
import type { DraftStore } from "../../platform/storage.js";
import { useLatest } from "../../platform/use-latest.js";
import type { RunView } from "./run-state-model.js";
import { useEscapeStop } from "./use-escape-stop.js";

const NO_QUEUE: QueuedMessage[] = [];

const ignoreFailure = (): null => null;

const cancelQuietly = (projectId: string, runId: string): void => {
  startTransition(async () => {
    try {
      await api.cancelRun(projectId, runId);
    } catch {
      ignoreFailure();
    }
  });
};

interface RunControls {
  onCancel: () => void;
  queue: QueuedMessage[];
  onQueueChange: (items: QueuedMessage[]) => void;
  onSteer: (text: string) => void;
}

type TrackSend = (
  start: () => Promise<{ runId: string }>
) => Promise<{ runId: string; stopped: boolean }>;

type RunTask = () => Promise<void>;

interface LiveState {
  readonly act: (task: RunTask) => Promise<void>;
  readonly activeRun: RunView | null;
  readonly draft: DraftStore;
  readonly projectId: string;
}

interface LocalQueue {
  readonly items: QueuedMessage[];
  readonly runId: string;
}

interface PendingSend {
  count: number;
  stop: boolean;
}

interface ControlContext {
  readonly live: { readonly current: LiveState };
  readonly localRef: { readonly current: LocalQueue | null };
  readonly pending: { readonly current: PendingSend };
  readonly setLocal: Dispatch<SetStateAction<LocalQueue | null>>;
  readonly setPutting: Dispatch<SetStateAction<number>>;
  readonly setSending: Dispatch<SetStateAction<number>>;
}

const settleSend = (context: ControlContext): void => {
  const { pending } = context;
  pending.current.count -= 1;

  if (pending.current.count === 0) {
    pending.current.stop = false;
  }

  context.setSending(pending.current.count);
};

const trackSendWith = async (
  context: ControlContext,
  start: () => Promise<{ runId: string }>
): Promise<{ runId: string; stopped: boolean }> => {
  const { pending } = context;
  pending.current.count += 1;
  context.setSending(pending.current.count);
  let runId = "";

  try {
    ({ runId } = await start());
  } catch (error) {
    settleSend(context);
    throw error;
  }

  const stopped = pending.current.stop;

  if (stopped) {
    cancelQuietly(context.live.current.projectId, runId);
  }

  settleSend(context);

  return { runId, stopped };
};

const withRun = (
  context: ControlContext,
  task: (run: RunView) => Promise<void>
): void => {
  const run = context.live.current.activeRun;

  if (run) {
    void context.live.current.act(() => task(run));
  }
};

const toSentQueue = (context: ControlContext, run: RunView): QueuedMessage[] =>
  pick(
    context.localRef.current?.runId === run.runId,
    context.localRef.current?.items ?? NO_QUEUE,
    run.queue
  );

const cancelRunWith = async (
  context: ControlContext,
  run: RunView
): Promise<void> => {
  const queuedBack = toSentQueue(context, run)
    .map((item) => item.text)
    .join("\n\n");

  const { draft, projectId } = context.live.current;

  if (queuedBack) {
    draft.set(
      [queuedBack, draft.get()].filter((text) => text.trim()).join("\n\n")
    );
  }

  await api.cancelRun(projectId, run.runId);
};

const cancelWith = (context: ControlContext): void => {
  if (!context.live.current.activeRun && context.pending.current.count > 0) {
    context.pending.current.stop = true;

    return;
  }

  withRun(context, async (run) => {
    await cancelRunWith(context, run);
  });
};

const changeQueueWith = (
  context: ControlContext,
  items: QueuedMessage[]
): void =>
  withRun(context, async (run) => {
    context.setPutting((count) => count + 1);
    context.setLocal({ items, runId: run.runId });

    try {
      await api.setQueue(context.live.current.projectId, run.runId, items);
    } catch (error) {
      context.setLocal(null);
      context.setPutting((count) => count - 1);
      throw error;
    }

    context.setPutting((count) => count - 1);
  });

const steerWith = (context: ControlContext, text: string): void =>
  withRun(context, async (run) => {
    await api.steerRun(context.live.current.projectId, run.runId, text);
  });

const toQueue = (
  local: LocalQueue | null,
  activeRun: RunView | null
): QueuedMessage[] => {
  if (local && local.runId === activeRun?.runId) {
    return local.items;
  }

  return activeRun?.queue ?? NO_QUEUE;
};

const useRunControls = (
  projectId: string,
  activeRun: RunView | null,
  draft: DraftStore,
  act: (task: RunTask) => Promise<void>
): RunControls & { trackSend: TrackSend } => {
  const live = useLatest({ act, activeRun, draft, projectId });
  const [sending, setSending] = useState(0);
  const [putting, setPutting] = useState(0);
  const pending = useRef<PendingSend>({ count: 0, stop: false });
  const [local, setLocal] = useState<LocalQueue | null>(null);
  const localRef = useLatest(local);
  const activeId = activeRun?.runId ?? null;
  const serverQueue = activeRun?.queue;
  const [seen, setSeen] = useState({ activeId, serverQueue });

  if (seen.activeId !== activeId || seen.serverQueue !== serverQueue) {
    setSeen({ activeId, serverQueue });

    if (putting === 0) {
      setLocal(null);
    }
  }

  const controls = useMemo(() => {
    const context: ControlContext = {
      live,
      localRef,
      pending,
      setLocal,
      setPutting,
      setSending,
    };

    return {
      onCancel: (): void => cancelWith(context),
      onQueueChange: (items: QueuedMessage[]): void =>
        changeQueueWith(context, items),
      onSteer: (text: string): void => steerWith(context, text),
      trackSend: (
        start: () => Promise<{ runId: string }>
      ): Promise<{ runId: string; stopped: boolean }> =>
        trackSendWith(context, start),
    };
  }, [live, localRef]);

  useEffect(() => {
    if (activeId && pending.current.stop) {
      cancelQuietly(projectId, activeId);
    }
  }, [activeId, projectId]);

  useEscapeStop(activeRun !== null || sending > 0, controls.onCancel);

  return { ...controls, queue: toQueue(local, activeRun) };
};

export { useRunControls };

export type { RunControls, TrackSend };
