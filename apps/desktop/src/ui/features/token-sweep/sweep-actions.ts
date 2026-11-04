import { useCallback, useTransition } from "react";

import { stepEditHistory, tokenRoutes, useAction } from "./deps.js";
import type { SweepView } from "./sweep-model.js";

interface SweepActionsSetup {
  readonly directionId: string | null;
  readonly onFailure: (message: string | null) => void;
  readonly onScanned: (report: SweepView) => void;
  readonly onSwept: (report: SweepView) => void;
  readonly onUndone: () => void;
  readonly projectId: string;
  readonly selected: ReadonlySet<string>;
}

interface SweepActions {
  readonly apply: () => void;
  readonly error: string | null;
  readonly isBusy: boolean;
  readonly scan: () => void;
  readonly undo: () => void;
}

const undoStep = async (
  project: string,
  direction: string
): Promise<string | null> => {
  try {
    await stepEditHistory(project, direction, "undo");

    return null;
  } catch (error) {
    return String(error);
  }
};

const useSweepActions = (setup: SweepActionsSetup): SweepActions => {
  const { directionId: direction, onFailure, onScanned } = setup;
  const { onSwept, onUndone, projectId: project, selected } = setup;
  const sweeper = useAction(tokenRoutes.applyToken);
  const [isWorking, startWork] = useTransition();
  const { run } = sweeper;

  const scan = useCallback(() => {
    if (direction === null) {
      return;
    }

    startWork(async () => {
      const found = await run({
        directionId: direction,
        dryRun: true,
        projectId: project,
      });

      if (found !== null) {
        onScanned(found);
      }
    });
  }, [direction, onScanned, project, run]);

  const apply = useCallback(() => {
    if (direction === null || selected.size === 0) {
      return;
    }

    startWork(async () => {
      const done = await run({
        directionId: direction,
        dryRun: false,
        projectId: project,
        select: [...selected],
      });

      if (done !== null) {
        onSwept(done);
      }
    });
  }, [direction, onSwept, project, run, selected]);

  const undo = useCallback(() => {
    if (direction === null) {
      return;
    }

    startWork(async () => {
      const problem = await undoStep(project, direction);

      if (problem === null) {
        onUndone();
      } else {
        onFailure(problem);
      }
    });
  }, [direction, onFailure, onUndone, project]);

  const error = sweeper.error?.message ?? null;
  const isBusy = isWorking || sweeper.pending;

  return { apply, error, isBusy, scan, undo };
};

export { useSweepActions };

export type { SweepActions };
