import { useCallback } from "react";
import type { TransitionStartFunction } from "react";

import { useAction, versionRoutes } from "./deps.js";
import type { ActionState } from "./deps.js";

interface ResetOptions {
  readonly directionId: string;
  readonly onReset: () => void;
  readonly previous: string | null;
  readonly projectId: string;
  readonly startSubmit: TransitionStartFunction;
}

interface ResetView {
  readonly handleReset: () => void;
  readonly restore: ActionState<typeof versionRoutes.restoreVersion>;
}

const useResetContent = (options: ResetOptions): ResetView => {
  const { directionId, onReset, previous, projectId, startSubmit } = options;
  const restore = useAction(versionRoutes.restoreVersion);

  const handleReset = useCallback(() => {
    if (previous === null) {
      return;
    }

    startSubmit(async () => {
      const result = await restore.run({
        directionId,
        projectId,
        versionId: previous,
      });

      if (result !== null) {
        onReset();
      }
    });
  }, [directionId, onReset, previous, projectId, restore, startSubmit]);

  return { handleReset, restore };
};

export { useResetContent };

export type { ResetOptions, ResetView };
