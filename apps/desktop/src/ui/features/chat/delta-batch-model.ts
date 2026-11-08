import type { StudioEvent } from "@design-studio/contracts";

import { applyRunEvent } from "./run-state-model.js";
import type { RunMap } from "./run-state-model.js";

type DeltaEvent = Extract<
  StudioEvent,
  { readonly type: "run.text.delta" | "run.thinking.delta" }
>;

type RunsUpdate = (update: (runs: RunMap) => RunMap) => void;

type Schedule = (fn: () => void) => () => void;

interface DeltaBatcher {
  readonly push: (event: StudioEvent) => void;
  readonly flush: () => void;
  readonly dispose: () => void;
}

const toMergedDeltas = (
  pending: DeltaEvent[],
  event: DeltaEvent
): DeltaEvent[] => {
  const last = pending.at(-1);

  if (!last || last.runId !== event.runId || last.type !== event.type) {
    return [...pending, event];
  }

  return [...pending.slice(0, -1), { ...event, text: last.text + event.text }];
};

const foldRunEvents = (
  runs: RunMap,
  events: readonly StudioEvent[]
): RunMap => {
  let folded = runs;

  for (const event of events) {
    folded = applyRunEvent(folded, event);
  }

  return folded;
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
      update((runs) => foldRunEvents(runs, batch));
    }
  };

  const dispose = (): void => {
    take();
  };

  const push = (event: StudioEvent): void => {
    if (
      event.type === "run.text.delta" ||
      event.type === "run.thinking.delta"
    ) {
      pending = toMergedDeltas(pending, event);
      cancel ??= schedule(flush);

      return;
    }

    const batch = take();

    if (batch.length === 0 && !event.type.startsWith("run.")) {
      return;
    }

    update((runs) => applyRunEvent(foldRunEvents(runs, batch), event));
  };

  return { dispose, flush, push };
};

const toFrameSchedule =
  (fallbackMs: number): Schedule =>
  (fn) => {
    let done = false;
    let frame = 0;
    let timer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const cancel = (): void => {
      done = true;
      cancelAnimationFrame(frame);

      if (timer !== null) {
        globalThis.clearTimeout(timer);
      }
    };

    const run = (): void => {
      if (done) {
        return;
      }

      cancel();
      fn();
    };

    frame = requestAnimationFrame(run);
    timer = globalThis.setTimeout(run, fallbackMs);

    return cancel;
  };

export { toMergedDeltas, createDeltaBatcher, toFrameSchedule };

export type { Schedule, DeltaBatcher };
