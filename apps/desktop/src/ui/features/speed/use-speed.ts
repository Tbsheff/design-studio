import { useCallback, useMemo, useTransition } from "react";

import { copy } from "./copy.js";
import { speedRoutes, useAction } from "./deps.js";
import { SPEED_RUNS } from "./speed-model.js";
import type { SpeedView } from "./speed-model.js";

interface SpeedSetup {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly projectId: string;
}

interface Speed {
  readonly error: string | null;
  readonly handleBaseline: () => void;
  readonly handleCompare: () => void;
  readonly isBusy: boolean;
  readonly view: SpeedView | null;
}

const useSpeed = (setup: SpeedSetup): Speed => {
  const { directionId, frameId, projectId } = setup;

  const [isWorking, startWork] = useTransition();

  const input = useMemo(
    () => ({ directionId, frameId, projectId }),
    [directionId, frameId, projectId]
  );

  const read = useAction(speedRoutes.getSpeed, input);
  const runner = useAction(speedRoutes.runSpeed);
  const { run } = runner;

  const runPhase = useCallback(
    (phase: "baseline" | "compare") => {
      startWork(async () => {
        await run({
          directionId,
          frameId,
          phase,
          projectId,
          runs: SPEED_RUNS,
        });
      });
    },
    [directionId, frameId, projectId, run]
  );

  const handleBaseline = useCallback(() => runPhase("baseline"), [runPhase]);
  const handleCompare = useCallback(() => runPhase("compare"), [runPhase]);
  const failure = runner.error ?? read.error;
  let error: string | null = null;

  if (failure !== null) {
    error = failure.message || copy.runFailed;
  }

  return {
    error,
    handleBaseline,
    handleCompare,
    isBusy: isWorking || runner.pending,
    view: read.data,
  };
};

export { useSpeed };

export type { Speed, SpeedSetup };
