import type { FrameStateDef } from "@design-studio/contracts/frame-state";
import { useCallback } from "react";

import { setFrameState } from "./frame-states-model.js";
import {
  KEPT_STATE_NAME,
  isCustomState,
  pushOpenSteps,
  toStepsWith,
} from "./open-steps-model.js";

interface KeepOpen {
  readonly clearSteps: () => void;
  readonly custom: FrameStateDef | null;
  readonly keepOpen: () => void;
}

const saveThenPush = async (task: Promise<unknown>): Promise<void> => {
  await task;
  pushOpenSteps();
};

const useKeepOpen = ({
  def,
  frameId,
  projectId,
  run,
  trigger,
}: {
  def: FrameStateDef | null;
  frameId: string;
  projectId: string;
  run: (task: Promise<unknown>) => Promise<void>;
  trigger: string | null;
}): KeepOpen => {
  let custom: FrameStateDef | null = null;

  if (isCustomState(def)) {
    custom = def;
  }

  const keepOpen = useCallback((): void => {
    if (trigger === null) {
      return;
    }

    if (custom) {
      const steps = toStepsWith(custom, trigger);
      const save = setFrameState(projectId, frameId, custom.id, { steps });

      void run(saveThenPush(save));

      return;
    }

    const save = setFrameState(projectId, frameId, "mock", {
      name: KEPT_STATE_NAME,
      signedIn: def?.signedIn ?? false,
      steps: toStepsWith(null, trigger),
    });

    void run(saveThenPush(save));
  }, [trigger, custom, def, run, projectId, frameId]);

  const clearSteps = useCallback((): void => {
    if (custom) {
      void run(setFrameState(projectId, frameId, custom.id, { steps: [] }));
    }
  }, [custom, run, projectId, frameId]);

  return { clearSteps, custom, keepOpen };
};

export { useKeepOpen };
