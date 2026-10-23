import type { StudioEvent } from '../shared/contracts';
import { applyRunEvent, type RunMap } from './runState';

type DeltaEvent = Extract<StudioEvent, { type: 'run.text.delta' }>;
type RunsUpdate = (update: (runs: RunMap) => RunMap) => void;
export type Schedule = (fn: () => void) => () => void;

export interface DeltaBatcher {
  push(event: StudioEvent): void;
  flush(): void;
  dispose(): void;
}

export function mergeDeltas(pending: DeltaEvent[], event: DeltaEvent): DeltaEvent[] {
  const last = pending.at(-1);
  if (!last || last.runId !== event.runId) return [...pending, event];
  return [...pending.slice(0, -1), { ...event, text: last.text + event.text }];
}

export function createDeltaBatcher(update: RunsUpdate, schedule: Schedule): DeltaBatcher {
  let pending: DeltaEvent[] = [];
  let cancel: (() => void) | null = null;

  const take = (): DeltaEvent[] => {
    cancel?.();
    cancel = null;
    const out = pending;
    pending = [];
    return out;
  };

  const flush = () => {
    const batch = take();
    if (batch.length > 0) update((runs) => batch.reduce(applyRunEvent, runs));
  };

  return {
    push(event) {
      if (event.type === 'run.text.delta') {
        pending = mergeDeltas(pending, event);
        cancel ??= schedule(flush);
        return;
      }
      const batch = take();
      if (batch.length === 0 && !event.type.startsWith('run.')) return;
      update((runs) => applyRunEvent(batch.reduce(applyRunEvent, runs), event));
    },
    flush,
    dispose() {
      take();
    },
  };
}

export const frameOrTimeout =
  (fallbackMs: number): Schedule =>
  (fn) => {
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      fn();
    };
    const frame = requestAnimationFrame(run);
    const timer = window.setTimeout(run, fallbackMs);
    return () => {
      done = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  };
