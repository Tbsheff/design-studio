import type { QueuedMessage } from "@design-studio/contracts";
import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "../../api.js";
import type { DraftStore } from "../../platform/storage.js";
import type { RunView } from "./run-state-model.js";
import { useEscapeStop } from "./use-escape-stop.js";

const NO_QUEUE: QueuedMessage[] = [];

const cancelQuietly = (projectId: string, runId: string): void => {
  void api.cancelRun(projectId, runId).catch(() => null);
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

const useRunControls = (
  projectId: string,
  activeRun: RunView | null,
  draft: DraftStore,
  act: (fn: () => Promise<unknown>) => Promise<void>
): RunControls & { trackSend: TrackSend } => {
  const live = useRef({ act, activeRun, draft, projectId });
  live.current = { act, activeRun, draft, projectId };
  const [sending, setSending] = useState(0);
  const pending = useRef({ count: 0, stop: false });

  const [local, setLocal] = useState<{
    runId: string;
    items: QueuedMessage[];
  } | null>(null);

  const putting = useRef(0);
  const localRef = useRef(local);
  localRef.current = local;

  const controls = useMemo(() => {
    const trackSend: TrackSend = async (start) => {
      pending.current.count += 1;
      setSending(pending.current.count);

      try {
        const { runId } = await start();
        const stopped = pending.current.stop;

        if (stopped) {
          cancelQuietly(live.current.projectId, runId);
        }

        return { runId, stopped };
      } finally {
        pending.current.count -= 1;

        if (pending.current.count === 0) {
          pending.current.stop = false;
        }

        setSending(pending.current.count);
      }
    };

    const withRun = (fn: (run: RunView) => Promise<unknown>): void => {
      const run = live.current.activeRun;

      if (run) {
        void live.current.act(() => fn(run));
      }
    };

    return {
      onCancel: (): void => {
        if (!live.current.activeRun && pending.current.count > 0) {
          pending.current.stop = true;

          return;
        }

        withRun((run) => {
          const sent =
            localRef.current?.runId === run.runId
              ? localRef.current.items
              : run.queue;

          const queuedBack = sent.map((item) => item.text).join("\n\n");
          const current = live.current.draft;

          if (queuedBack) {
            current.set(
              [queuedBack, current.get()]
                .filter((text) => text.trim())
                .join("\n\n")
            );
          }

          return api.cancelRun(live.current.projectId, run.runId);
        });
      },
      onQueueChange: (items: QueuedMessage[]): void =>
        withRun(async (run) => {
          putting.current += 1;
          setLocal({ items, runId: run.runId });

          try {
            await api.setQueue(live.current.projectId, run.runId, items);
          } catch (error) {
            setLocal(null);
            throw error;
          } finally {
            putting.current -= 1;
          }
        }),
      onSteer: (text: string): void =>
        withRun((run) => api.steerRun(live.current.projectId, run.runId, text)),
      trackSend,
    };
  }, []);

  const activeId = activeRun?.runId ?? null;
  const serverQueue = activeRun?.queue;
  useEffect(() => {
    if (putting.current === 0) {
      setLocal(null);
    }
  }, [serverQueue, activeId]);
  useEffect(() => {
    if (activeId && pending.current.stop) {
      cancelQuietly(projectId, activeId);
    }
  }, [activeId, projectId]);
  useEscapeStop(activeRun !== null || sending > 0, controls.onCancel);

  const queue =
    local && local.runId === activeId
      ? local.items
      : (activeRun?.queue ?? NO_QUEUE);

  return { ...controls, queue };
};

export { useRunControls };

export type { RunControls, TrackSend };
