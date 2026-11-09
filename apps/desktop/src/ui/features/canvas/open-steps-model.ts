import { MAX_OPEN_STEPS } from "@design-studio/contracts/frame-state";
import type {
  FrameStateDef,
  OpenStep,
} from "@design-studio/contracts/frame-state";

import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { copy } from "./copy.js";

type MissedByState = Readonly<Record<string, readonly number[]>>;

const selectedTrigger: LiveStore<string | null> = createLiveStore<
  string | null
>(null);

const missedSteps: LiveStore<MissedByState> = createLiveStore<MissedByState>(
  {}
);

const openStepsPush: LiveStore<number> = createLiveStore<number>(0);

const pushOpenSteps = (): void => openStepsPush.set(openStepsPush.get() + 1);

const KEPT_STATE_NAME = "Kept open";

const toStepsOf = (def: FrameStateDef | null): OpenStep[] => def?.steps ?? [];

const canAddStep = (def: FrameStateDef | null): boolean =>
  toStepsOf(def).length < MAX_OPEN_STEPS;

const toStepsWith = (
  def: FrameStateDef | null,
  selector: string
): OpenStep[] => {
  const steps = toStepsOf(def);

  if (steps.some((step) => step.selector === selector)) {
    return steps;
  }

  return [...steps, { kind: "click", selector }];
};

const isCustomState = (def: FrameStateDef | null): def is FrameStateDef =>
  def !== null && def.kind === "mock";

const toKeepTip = (
  trigger: string | null,
  custom: FrameStateDef | null
): string | null => {
  if (!canAddStep(custom)) {
    return copy.openStepsFull;
  }

  if (trigger === null) {
    return copy.keepOpenHint;
  }

  return trigger;
};

const setMissed = (stateId: string, missed: readonly number[]): void => {
  const prior = missedSteps.get();
  const same = (prior[stateId] ?? []).join(",") === missed.join(",");

  if (same) {
    return;
  }

  missedSteps.set({ ...prior, [stateId]: missed });
};

const toMissedText = (missed: readonly number[]): string =>
  `Missed step ${missed.map((index) => index + 1).join(", ")}`;

export {
  KEPT_STATE_NAME,
  canAddStep,
  isCustomState,
  missedSteps,
  openStepsPush,
  pushOpenSteps,
  selectedTrigger,
  setMissed,
  toKeepTip,
  toMissedText,
  toStepsOf,
  toStepsWith,
};

export type { MissedByState };
