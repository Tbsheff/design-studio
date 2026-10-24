import { useMemo, useRef } from 'react';
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

export function useRunControls(activeRun: RunView | null, draft: DraftStore, act: (fn: () => Promise<unknown>) => Promise<void>): RunControls {
  const live = useRef({ activeRun, draft, act });
  live.current = { activeRun, draft, act };
  const controls = useMemo(() => {
    const withRun = (fn: (run: RunView) => Promise<unknown>) => {
      const run = live.current.activeRun;
      if (run) void live.current.act(() => fn(run));
    };
    return {
      onCancel: () =>
        withRun((run) => {
          const queuedBack = run.queue.map((item) => item.text).join('\n\n');
          const current = live.current.draft;
          if (queuedBack) current.set([queuedBack, current.get()].filter((text) => text.trim()).join('\n\n'));
          return api.cancelRun(run.runId);
        }),
      onQueueChange: (items: QueuedMessage[]) => withRun((run) => api.setQueue(run.runId, items)),
      onSteer: (text: string) => withRun((run) => api.steerRun(run.runId, text)),
    };
  }, []);
  useEscapeStop(activeRun !== null, controls.onCancel);
  return { ...controls, queue: activeRun?.queue ?? NO_QUEUE };
}
