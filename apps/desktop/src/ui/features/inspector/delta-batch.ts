import type { StudioEvent } from "@design-studio/contracts";

import { applyRunEvent } from "../chat/run-state-model.js";
import type { RunMap } from "../chat/run-state-model.js";

type DeltaEvent = Extract<
  StudioEvent,
  { readonly type: "run.text.delta" | "run.thinking.delta" }
>;

type RunsUpdate = (update: (runs: RunMap) => RunMap) => void;

type Schedule = (fn: () => void) => () => void;

interface DeltaBatcher {
  push(event: StudioEvent): void;
  flush(): void;
  dispose(): void;
}

const mergeDeltas = (
  pending: DeltaEvent[],
  event: DeltaEvent
): DeltaEvent[] => {
  const last = pending.at(-1);

  if (!last || last.runId !== event.runId || last.type !== event.type) {
    return [...pending, event];
  }

  return [...pending.slice(0, -1), { ...event, text: last.text + event.text }];
};

const createDeltaBatcher = (
  update: RunsUpdate,
  schedule: Schedule
): DeltaBatcher => {
  let pending: DeltaEvent[] = [];
  let cancel: (() => void) | null = null;

  const take = (): DeltaEvent[] => {
    cancel?.();
    cancel = null;
    const out = pending;
    pending = [];

    return out;
  };

  const flush = (): void => {
    const batch = take();

    if (batch.length > 0) {
      update((runs) => batch.reduce(applyRunEvent, runs));
    }
  };

  return {
    dispose() {
      take();
    },
    flush,
    push(event) {
      if (
        event.type === "run.text.delta" ||
        event.type === "run.thinking.delta"
      ) {
        pending = mergeDeltas(pending, event);
        cancel ??= schedule(flush);

        return;
      }

      const batch = take();

      if (batch.length === 0 && !event.type.startsWith("run.")) {
        return;
      }

      update((runs) => applyRunEvent(batch.reduce(applyRunEvent, runs), event));
    },
  };
};

const frameOrTimeout =
  (fallbackMs: number): Schedule =>
  (fn) => {
    let done = false;

    const run = (): void => {
      if (done) {
        return;
      }

      done = true;
      cancelAnimationFrame(frame);
      globalThis.clearTimeout(timer);
      fn();
    };

    const frame = requestAnimationFrame(run);
    const timer = globalThis.setTimeout(run, fallbackMs);

    return () => {
      done = true;
      cancelAnimationFrame(frame);
      globalThis.clearTimeout(timer);
    };
  };

export { mergeDeltas, createDeltaBatcher, frameOrTimeout };

export type { Schedule, DeltaBatcher };
