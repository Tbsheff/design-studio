import { routes } from "@design-studio/actions/canvas/routes";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  requestSelectionStop,
  selectionRunEnd,
  sendSelectionPrompt,
} from "../../platform/ask-chat.js";
import type { SelectionRunEnd } from "../../platform/ask-chat.js";
import { call } from "../../platform/http.js";
import type { RouteInput } from "../../platform/http.js";
import { useLive } from "../../platform/live-store.js";
import { useLatest } from "../../platform/use-latest.js";
import { canvasStore } from "./canvas-frames-model.js";
import {
  IDLE_PHASE,
  isRunDone,
  toActivePhase,
  toEndedPhase,
  toNextStepIndex,
  toStateRunPrompt,
} from "./state-run-model.js";
import type {
  StateRunActive,
  StateRunPhase,
  StateRunPlan,
  StateRunWire,
} from "./state-run-model.js";
import { activateFrameId } from "./use-canvas-frames.js";

type StateCheckQuery = RouteInput<typeof routes.inspectStateFramesCanvas>;

interface StateRunsInput {
  readonly projectId: string;
  readonly query: StateCheckQuery | null;
  readonly refetch: () => Promise<void>;
}

interface StateRuns {
  readonly phase: StateRunPhase;
  readonly handleStart: (plan: StateRunPlan) => void;
  readonly handleStop: () => void;
}

interface PhaseState {
  readonly applyPhase: (next: StateRunPhase) => void;
  readonly phase: StateRunPhase;
  readonly ref: { readonly current: StateRunPhase };
}

interface RunEndAdvance {
  readonly applyPhase: (next: StateRunPhase) => void;
  readonly latest: { readonly current: StateRunsInput };
  readonly ref: { readonly current: StateRunPhase };
  readonly startStep: (plan: StateRunPlan, index: number) => void;
}

interface FrameSend {
  readonly clearPending: () => void;
  readonly sendToFrame: (frameId: string, prompt: string) => void;
}

const toActivePrompt = (active: StateRunActive): string | null => {
  const step = active.plan.steps[active.index];

  if (!step) {
    return null;
  }

  return toStateRunPrompt(active.plan.page, step);
};

const readFresh = async (
  query: StateCheckQuery | null
): Promise<StateRunWire | null> => {
  if (query === null) {
    return null;
  }

  try {
    return await call(routes.inspectStateFramesCanvas, query);
  } catch {
    return null;
  }
};

const useFrameSend = (projectId: string): FrameSend => {
  const pending = useRef<{ frameId: string; prompt: string } | null>(null);

  const activeId = useSyncExternalStore(
    canvasStore.subscribe,
    () => canvasStore.get(projectId)?.activeId ?? null
  );

  useEffect(() => {
    const next = pending.current;

    if (next !== null && activeId === next.frameId) {
      pending.current = null;
      sendSelectionPrompt(next.prompt);
    }
  }, [activeId]);

  const sendToFrame = useCallback(
    (frameId: string, prompt: string): void => {
      if (canvasStore.get(projectId)?.activeId === frameId) {
        sendSelectionPrompt(prompt);

        return;
      }

      pending.current = { frameId, prompt };
      activateFrameId(projectId, frameId);
    },
    [projectId]
  );

  const clearPending = useCallback((): void => {
    pending.current = null;
  }, []);

  return { clearPending, sendToFrame };
};

const usePhase = (): PhaseState => {
  const [phase, setPhase] = useState<StateRunPhase>(IDLE_PHASE);
  const ref = useRef<StateRunPhase>(IDLE_PHASE);

  const applyPhase = useCallback((next: StateRunPhase): void => {
    ref.current = next;
    setPhase(next);
  }, []);

  return { applyPhase, phase, ref };
};

const useRunEndAdvance = (advance: RunEndAdvance): void => {
  const { applyPhase, latest, ref, startStep } = advance;
  const end = useLive(selectionRunEnd);
  const seenEnd = useRef<SelectionRunEnd | null>(end);

  useEffect(() => {
    const { current } = ref;

    if (end === null || end === seenEnd.current) {
      return;
    }

    seenEnd.current = end;

    if (current.kind !== "running" || end.prompt !== toActivePrompt(current)) {
      return;
    }

    if (!isRunDone(end.status)) {
      applyPhase(toEndedPhase(current));

      return;
    }

    startTransition(async (): Promise<void> => {
      const fresh = await readFresh(latest.current.query);

      if (ref.current !== current) {
        return;
      }

      const next = toNextStepIndex(current.plan, current.index, fresh);

      if (next === null) {
        applyPhase(IDLE_PHASE);
      } else {
        startStep(current.plan, next);
      }

      await latest.current.refetch();
    });
  }, [applyPhase, end, latest, ref, startStep]);
};

const useStateRuns = (input: StateRunsInput): StateRuns => {
  const { applyPhase, phase, ref } = usePhase();
  const { clearPending, sendToFrame } = useFrameSend(input.projectId);
  const latest = useLatest(input);

  const startStep = useCallback(
    (plan: StateRunPlan, index: number): void => {
      const step = plan.steps[index];

      if (!step) {
        applyPhase(IDLE_PHASE);

        return;
      }

      applyPhase(toActivePhase(plan, index));
      sendToFrame(step.frameId, toStateRunPrompt(plan.page, step));
    },
    [applyPhase, sendToFrame]
  );

  useRunEndAdvance({ applyPhase, latest, ref, startStep });

  const handleStart = useCallback(
    (plan: StateRunPlan): void => {
      startStep(plan, 0);
    },
    [startStep]
  );

  const handleStop = useCallback((): void => {
    const { current } = ref;

    clearPending();
    requestSelectionStop();

    if (current.kind !== "running") {
      applyPhase(IDLE_PHASE);

      return;
    }

    applyPhase(toEndedPhase(current));
  }, [applyPhase, clearPending, ref]);

  return { handleStart, handleStop, phase };
};

export { useStateRuns };

export type { StateRuns, StateRunsInput };
