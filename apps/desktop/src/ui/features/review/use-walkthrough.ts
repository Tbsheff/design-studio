import { routes as walkthroughRoutes } from "@design-studio/actions/walkthrough/routes";
import { useCallback, useState, useTransition } from "react";

import type { RouteOutput } from "../../platform/http.js";
import { useAction } from "../../platform/query.js";

type WalkthroughView = RouteOutput<typeof walkthroughRoutes.runWalkthrough>;

interface WalkthroughOptions {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly projectId: string;
}

interface WalkthroughState {
  readonly error: string | null;
  readonly handleRun: () => void;
  readonly handleTask: (task: string) => void;
  readonly isBusy: boolean;
  readonly isReady: boolean;
  readonly result: WalkthroughView | null;
  readonly task: string;
}

const TASK_MIN = 10;

const MAX_STEPS = 12;

const useWalkthrough = (options: WalkthroughOptions): WalkthroughState => {
  const {
    directionId: direction,
    frameId: frame,
    projectId: project,
  } = options;

  const [task, setTask] = useState("");
  const [result, setResult] = useState<WalkthroughView | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const runner = useAction(walkthroughRoutes.runWalkthrough);
  const { run } = runner;
  const trimmed = task.trim();
  const isReady = trimmed.length >= TASK_MIN && direction !== null;

  const handleRun = useCallback(() => {
    if (!isReady) {
      return;
    }

    startSubmit(async () => {
      const done = await run({
        canWrite: false,
        directionId: direction,
        frameId: frame,
        maxSteps: MAX_STEPS,
        persona: null,
        projectId: project,
        task: trimmed,
      });

      if (done !== null) {
        setResult(done);
      }
    });
  }, [direction, frame, isReady, project, run, trimmed]);

  const handleTask = useCallback((next: string) => {
    setTask(next);
  }, []);

  const isBusy = isSubmitting || runner.pending;

  return {
    error: runner.error?.message ?? null,
    handleRun,
    handleTask,
    isBusy,
    isReady,
    result,
    task,
  };
};

export { useWalkthrough };

export type { WalkthroughOptions, WalkthroughState, WalkthroughView };
