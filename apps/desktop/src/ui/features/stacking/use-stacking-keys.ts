import { useEffect, useRef, useTransition } from "react";
import type { MutableRefObject } from "react";

import { copy } from "./copy.js";
import {
  insertError,
  isMacPlatform,
  isTypingTarget,
  matchesKey,
  STACKING_KEY_EVENT,
  useEditVariant,
} from "./deps.js";
import type {
  PreviewPort,
  SelectionContext,
  SelectionStack,
  StackingKeyDetail,
} from "./deps.js";
import { writeZOrder } from "./stacking-api.js";
import type { StackingIds, ZTargetEdit } from "./stacking-api.js";
import { breakpointOf } from "./stacking-model.js";
import type { StackingEdit } from "./stacking-model.js";
import { toCompare, toPaintKey, toZPlan } from "./z-order-model.js";
import type { ZStep, ZStop, ZWrite } from "./z-order-model.js";
import { readStack } from "./z-order-read.js";

interface StackingKeysOptions {
  readonly busy: boolean;
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly notify: (message: string) => void;
  readonly port: MutableRefObject<PreviewPort | null> | undefined;
  readonly projectId: string;
  readonly selection: SelectionContext[];
}

interface StepRun {
  readonly breakpoint: string;
  readonly ids: StackingIds;
  readonly options: StackingKeysOptions;
  readonly step: ZStep;
}

type StepStop = ZStop | "no-read";

const IS_MAC = isMacPlatform();

const STEP_KEYS = [
  { appKey: "layer-forward", keyId: "bring-forward", step: "forward" },
  { appKey: "layer-backward", keyId: "send-backward", step: "backward" },
  { appKey: "layer-front", keyId: "bring-to-front", step: "front" },
  { appKey: "layer-back", keyId: "send-to-back", step: "back" },
] as const;

type StepKey = (typeof STEP_KEYS)[number];

const toStopText = (stop: StepStop, step: ZStep): string => {
  if (stop === "no-overlap") {
    return copy.zStop[`no-overlap-${step}`];
  }

  return copy.zStop[stop];
};

const toDomOrder = (selection: SelectionContext[]): SelectionContext[] =>
  selection.toSorted((one, two) => {
    const left = one.source;
    const right = two.source;

    if (left === null || right === null || left.file !== right.file) {
      return 0;
    }

    return left.line - right.line || left.col - right.col;
  });

const toTarget = (
  write: ZWrite
): Pick<SelectionContext, "selector" | "source" | "tag"> => ({
  selector: write.peer.selector,
  source: write.peer.source,
  tag: write.peer.tag,
});

const toZEdit = (write: ZWrite): StackingEdit => {
  if (write.position === null) {
    return { zIndex: write.zIndex };
  }

  return { position: write.position, zIndex: write.zIndex };
};

interface StepPlan {
  readonly stop: StepStop | null;
  readonly writes: readonly ZTargetEdit[];
}

const toSourceKey = (layer: ZTargetEdit): string => {
  const { source } = layer.target;

  if (source === null) {
    return layer.target.selector;
  }

  return `${source.file}:${source.line}:${source.col}`;
};

const toStepPlan = async (
  run: StepRun,
  target: SelectionContext
): Promise<StepPlan> => {
  const stack = await readStack(run.options.port?.current ?? null, target);

  if (stack === null) {
    return { stop: "no-read", writes: [] };
  }

  const plan = toZPlan(stack, run.step);

  if (plan.kind === "stop") {
    return { stop: plan.stop, writes: [] };
  }

  return {
    stop: null,
    writes: plan.writes.map((write) => ({
      edit: toZEdit(write),
      target: toTarget(write),
    })),
  };
};

const toUniqueWrites = (plans: readonly StepPlan[]): ZTargetEdit[] => {
  const seen = new Map<string, ZTargetEdit>();

  for (const plan of plans) {
    for (const write of plan.writes) {
      if (!seen.has(toSourceKey(write))) {
        seen.set(toSourceKey(write), write);
      }
    }
  }

  return [...seen.values()];
};

interface PaintEntry {
  readonly stack: SelectionStack | null;
  readonly target: SelectionContext;
}

const readEntries = (
  run: StepRun,
  targets: readonly SelectionContext[]
): Promise<PaintEntry[]> =>
  Promise.all(
    targets.map(async (target) => ({
      stack: await readStack(run.options.port?.current ?? null, target),
      target,
    }))
  );

const toPaintCompare = (one: PaintEntry, two: PaintEntry): number => {
  if (one.stack === null || two.stack === null) {
    return 0;
  }

  return toCompare(toPaintKey(one.stack.self), toPaintKey(two.stack.self));
};

const isEndStep = (run: StepRun): boolean =>
  run.step === "front" || run.step === "back";

const toRunOrder = async (run: StepRun): Promise<SelectionContext[]> => {
  const targets = toDomOrder(run.options.selection);

  if (targets.length < 2 || !isEndStep(run)) {
    return targets;
  }

  const read = await readEntries(run, targets);
  const entries = read.toSorted(toPaintCompare);

  if (run.step === "back") {
    entries.reverse();
  }

  return entries.map((entry) => entry.target);
};

const runEndSteps = async (
  run: StepRun,
  targets: readonly SelectionContext[],
  done: readonly StepPlan[]
): Promise<StepPlan[]> => {
  const target = targets.at(0) ?? null;

  if (target === null) {
    return [...done];
  }

  const plan = await toStepPlan(run, target);

  if (plan.writes.length > 0) {
    await writeZOrder(run.ids, plan.writes, run.breakpoint);
  }

  return runEndSteps(run, targets.slice(1), [...done, plan]);
};

const runStepPlans = async (run: StepRun): Promise<StepPlan[]> => {
  const targets = await toRunOrder(run);

  if (isEndStep(run) && targets.length > 1) {
    return runEndSteps(run, targets, []);
  }

  const plans = await Promise.all(
    targets.map((target) => toStepPlan(run, target))
  );

  const writes = toUniqueWrites(plans);

  if (writes.length > 0) {
    await writeZOrder(run.ids, writes, run.breakpoint);
  }

  return plans;
};

const runZStep = async (run: StepRun): Promise<void> => {
  try {
    const plans = await runStepPlans(run);

    if (plans.some((plan) => plan.writes.length > 0)) {
      return;
    }

    const stop = plans.find((plan) => plan.stop !== null)?.stop ?? null;

    if (stop !== null) {
      run.options.notify(toStopText(stop, run.step));
    }
  } catch (error) {
    run.options.notify(insertError(error));
  }
};

const toStepRun = (
  options: StackingKeysOptions,
  key: StepKey,
  breakpoint: string
): StepRun | null => {
  const { directionId, projectId } = options;

  if (!options.enabled || directionId === null) {
    return null;
  }

  if (options.selection.length === 0) {
    return null;
  }

  const ids = { directionId, projectId };
  const { step } = key;

  return { breakpoint, ids, options, step };
};

const toPressedKey = (event: KeyboardEvent): StepKey | null => {
  if (event.defaultPrevented || event.repeat || isTypingTarget(event.target)) {
    return null;
  }

  return STEP_KEYS.find((key) => matchesKey(key.keyId, event, IS_MAC)) ?? null;
};

const toForwardedKey = (event: Event): StepKey | null => {
  if (!(event instanceof CustomEvent)) {
    return null;
  }

  const detail = event.detail as StackingKeyDetail | null;

  return STEP_KEYS.find((key) => key.appKey === detail?.id) ?? null;
};

const useStackingKeys = (options: StackingKeysOptions): void => {
  const breakpoint = breakpointOf(useEditVariant());
  const [isPending, startTransition] = useTransition();
  const latest = useRef({ breakpoint, isPending, options });

  useEffect(() => {
    latest.current = { breakpoint, isPending, options };
  }, [breakpoint, isPending, options]);

  useEffect(() => {
    const start = (key: StepKey): void => {
      const { current } = latest;
      const run = toStepRun(current.options, key, current.breakpoint);

      if (run === null) {
        return;
      }

      if (current.isPending || current.options.busy) {
        current.options.notify(copy.zStop.wait);

        return;
      }

      startTransition(async () => {
        await runZStep(run);
      });
    };

    const onKey = (event: KeyboardEvent): void => {
      const key = toPressedKey(event);

      if (key) {
        event.preventDefault();
        start(key);
      }
    };

    const onForwarded = (event: Event): void => {
      const key = toForwardedKey(event);

      if (key) {
        start(key);
      }
    };

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener(STACKING_KEY_EVENT, onForwarded);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener(STACKING_KEY_EVENT, onForwarded);
    };
  }, []);
};

export { useStackingKeys };

export type { StackingKeysOptions };
