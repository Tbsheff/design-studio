import type { WireOutput } from "@design-studio/actions/_core/action";
import type { inspectStateFramesCanvas } from "@design-studio/actions/canvas/inspect-state-frames";

import { stateRunCopy } from "./copy.js";

type StateRunWire = WireOutput<typeof inspectStateFramesCanvas>;

interface StateRunStep {
  readonly frameId: string;
  readonly state: string;
  readonly stateName: string;
}

interface StateRunPlan {
  readonly page: string;
  readonly steps: readonly StateRunStep[];
}

interface StateRunIdle {
  readonly kind: "idle";
}

interface StateRunActive {
  readonly index: number;
  readonly kind: "running";
  readonly plan: StateRunPlan;
}

interface StateRunEnded {
  readonly kind: "ended";
  readonly stateName: string;
}

type StateRunPhase = StateRunActive | StateRunEnded | StateRunIdle;

const DEFAULT_STATE = "default";

const COMPLETED = "completed";

const IDLE_PHASE: StateRunIdle = { kind: "idle" };

const toStateRunPlan = (wire: StateRunWire | null): StateRunPlan | null => {
  if (wire === null) {
    return null;
  }

  const steps = wire.items.flatMap((row): StateRunStep[] => {
    if (row.state === DEFAULT_STATE || !row.isSameAsDefault) {
      return [];
    }

    return [
      { frameId: row.frameId, state: row.state, stateName: row.stateName },
    ];
  });

  if (steps.length === 0) {
    return null;
  }

  return { page: wire.page, steps };
};

const toStateRunPrompt = (page: string, step: StateRunStep): string =>
  `${stateRunCopy.promptStart}${step.stateName}${stateRunCopy.promptOf}/${page}${stateRunCopy.promptEnd}`;

const isStillSame = (
  wire: StateRunWire | null,
  step: StateRunStep
): boolean => {
  if (wire === null) {
    return true;
  }

  const row = wire.items.find((item) => item.state === step.state);

  return row?.isSameAsDefault ?? false;
};

const toNextStepIndex = (
  plan: StateRunPlan,
  index: number,
  fresh: StateRunWire | null
): number | null => {
  const next = plan.steps.findIndex(
    (step, at) => at > index && isStillSame(fresh, step)
  );

  if (next === -1) {
    return null;
  }

  return next;
};

const isRunDone = (status: string): boolean => status === COMPLETED;

const toRunningLine = (active: StateRunActive): string => {
  const step = active.plan.steps[active.index];

  return `${stateRunCopy.designing}${step?.stateName ?? ""} (${active.index + 1}${stateRunCopy.of}${active.plan.steps.length})…`;
};

const toActivePhase = (plan: StateRunPlan, index: number): StateRunActive => {
  const kind = "running";

  return { index, kind, plan };
};

const toEndedPhase = (active: StateRunActive): StateRunEnded => ({
  kind: "ended",
  stateName: active.plan.steps[active.index]?.stateName ?? "",
});

const toEndedLine = (ended: StateRunEnded): string =>
  `${ended.stateName}${stateRunCopy.notDone}`;

export {
  IDLE_PHASE,
  isRunDone,
  toActivePhase,
  toEndedLine,
  toEndedPhase,
  toNextStepIndex,
  toRunningLine,
  toStateRunPlan,
  toStateRunPrompt,
};

export type {
  StateRunActive,
  StateRunEnded,
  StateRunPhase,
  StateRunPlan,
  StateRunStep,
  StateRunWire,
};
