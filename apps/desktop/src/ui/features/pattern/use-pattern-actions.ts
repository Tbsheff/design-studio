import { useCallback, useState, useTransition } from "react";

import { patternRoutes, useAction } from "./deps.js";
import type {
  PatternInserted,
  PatternPosition,
  PatternTarget,
} from "./pattern-model.js";

interface PatternActionsSetup {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface PatternActions {
  readonly error: string | null;
  readonly handleDelete: (patternId: string) => void;
  readonly handleInsert: (
    patternId: string,
    position: PatternPosition,
    target: PatternTarget
  ) => void;
  readonly handlePage: (patternId: string, page: string) => void;
  readonly isBusy: boolean;
  readonly result: PatternInserted | null;
}

const usePatternActions = (setup: PatternActionsSetup): PatternActions => {
  const [result, setResult] = useState<PatternInserted | null>(null);
  const [isBusy, startWork] = useTransition();
  const inserter = useAction(patternRoutes.insertPattern);
  const deleter = useAction(patternRoutes.deletePattern);
  const { run: runInsert } = inserter;
  const { run: runDelete } = deleter;
  const { directionId: direction, projectId: project } = setup;

  const handleInsert = useCallback(
    (id: string, where: PatternPosition, layer: PatternTarget): void => {
      if (direction === null) {
        return;
      }

      startWork(async () => {
        const done = await runInsert({
          directionId: direction,
          page: null,
          patternId: id,
          position: where,
          projectId: project,
          target: layer,
        });

        setResult(done);
      });
    },
    [direction, project, runInsert]
  );

  const handlePage = useCallback(
    (id: string, route: string): void => {
      if (direction === null) {
        return;
      }

      startWork(async () => {
        const done = await runInsert({
          directionId: direction,
          page: route,
          patternId: id,
          position: "inside",
          projectId: project,
          target: null,
        });

        setResult(done);
      });
    },
    [direction, project, runInsert]
  );

  const handleDelete = useCallback(
    (id: string): void => {
      startWork(async () => {
        await runDelete({ patternId: id });
      });
    },
    [runDelete]
  );

  return {
    error: inserter.error?.message ?? deleter.error?.message ?? null,
    handleDelete,
    handleInsert,
    handlePage,
    isBusy,
    result,
  };
};

export { usePatternActions };

export type { PatternActions, PatternActionsSetup };
