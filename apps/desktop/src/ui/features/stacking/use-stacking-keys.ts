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
  StackingKeyDetail,
} from "./deps.js";
import { writeZOrder } from "./stacking-api.js";
import type { StackingIds, ZTargetEdit } from "./stacking-api.js";
import { breakpointOf } from "./stacking-model.js";
import type { StackingEdit } from "./stacking-model.js";
import { toZPlan } from "./z-order-model.js";
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
  readonly write: ZTargetEdit | null;
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
    return { stop: "no-read", write: null };
  }

  const plan = toZPlan(stack, run.step);

  if (plan.kind === "stop") {
    return { stop: plan.stop, write: null };
  }

  return {
    stop: null,
    write: { edit: toZEdit(plan.write), target: toTarget(plan.write) },
  };
};

const toUniqueWrites = (plans: readonly StepPlan[]): ZTargetEdit[] => {
  const seen = new Map<string, ZTargetEdit>();

  for (const plan of plans) {
    if (plan.write !== null && !seen.has(toSourceKey(plan.write))) {
      seen.set(toSourceKey(plan.write), plan.write);
    }
  }

  return [...seen.values()];
};

const runZStep = async (run: StepRun): Promise<void> => {
  try {
    const plans = await Promise.all(
      toDomOrder(run.options.selection).map((target) => toStepPlan(run, target))
    );

    const writes = toUniqueWrites(plans);

    if (writes.length > 0) {
      await writeZOrder(run.ids, writes, run.breakpoint);

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
