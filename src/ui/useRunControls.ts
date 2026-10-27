import { useEffect, useMemo, useRef, useState } from 'react';
import type { QueuedMessage } from '../shared/contracts';
import { api } from './api';
import type { RunView } from './runState';
import type { DraftStore } from './storage';
import { useEscapeStop } from './useEscapeStop';

const NO_QUEUE: QueuedMessage[] = [];

export interface RunControls {
  onCancel: () => void;
  queue: QueuedMessage[];
  onQueueChange: (items: QueuedMessage[]) => void;
  onSteer: (text: string) => void;
}

export type TrackSend = (start: () => Promise<{ runId: string }>) => Promise<{ runId: string; stopped: boolean }>;

export function useRunControls(activeRun: RunView | null, draft: DraftStore, act: (fn: () => Promise<unknown>) => Promise<void>): RunControls & { trackSend: TrackSend } {
  const live = useRef({ activeRun, draft, act });
  live.current = { activeRun, draft, act };
  const [sending, setSending] = useState(0);
  const pending = useRef({ count: 0, stop: false });
  const [local, setLocal] = useState<{ runId: string; items: QueuedMessage[] } | null>(null);
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
        if (stopped) void api.cancelRun(runId).catch(() => undefined);
        return { runId, stopped };
      } finally {
        pending.current.count -= 1;
        if (pending.current.count === 0) pending.current.stop = false;
        setSending(pending.current.count);
      }
    };
    const withRun = (fn: (run: RunView) => Promise<unknown>) => {
      const run = live.current.activeRun;
      if (run) void live.current.act(() => fn(run));
    };
    return {
      trackSend,
      onCancel: () => {
        if (!live.current.activeRun && pending.current.count > 0) {
          pending.current.stop = true;
          return;
        }
        withRun((run) => {
          const sent = localRef.current?.runId === run.runId ? localRef.current.items : run.queue;
          const queuedBack = sent.map((item) => item.text).join('\n\n');
          const current = live.current.draft;
          if (queuedBack) current.set([queuedBack, current.get()].filter((text) => text.trim()).join('\n\n'));
          return api.cancelRun(run.runId);
        });
      },
      onQueueChange: (items: QueuedMessage[]) =>
        withRun(async (run) => {
          putting.current += 1;
          setLocal({ runId: run.runId, items });
          try {
            await api.setQueue(run.runId, items);
          } catch (error) {
            setLocal(null);
            throw error;
          } finally {
            putting.current -= 1;
          }
        }),
      onSteer: (text: string) => withRun((run) => api.steerRun(run.runId, text)),
    };
  }, []);
  const activeId = activeRun?.runId ?? null;
  const serverQueue = activeRun?.queue;
  useEffect(() => {
    if (putting.current === 0) setLocal(null);
  }, [serverQueue, activeId]);
  useEffect(() => {
    if (activeId && pending.current.stop) void api.cancelRun(activeId).catch(() => undefined);
  }, [activeId]);
  useEscapeStop(activeRun !== null || sending > 0, controls.onCancel);
  const queue = local && local.runId === activeId ? local.items : (activeRun?.queue ?? NO_QUEUE);
  return { ...controls, queue };
}
