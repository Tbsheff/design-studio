import { useCallback, useMemo, useTransition } from "react";

import { toCanCompare } from "./impact-model.js";
import type { ImpactView } from "./impact-model.js";
import { useGetImpact } from "./use-get.js";
import { useRunImpact } from "./use-run.js";

interface ImpactSetup {
  readonly directionId: string | null;
  readonly file: string;
  readonly projectId: string;
}

interface Impact {
  readonly canCompare: boolean;
  readonly error: Error | null;
  readonly handleBaseline: () => void;
  readonly handleCompare: () => void;
  readonly isBusy: boolean;
  readonly view: ImpactView | null;
}

const useImpact = (setup: ImpactSetup): Impact => {
  const { directionId, file: source, projectId } = setup;
  const [isWorking, startWork] = useTransition();

  const limit = 8;

  const input = useMemo(
    () => ({ directionId, limit, projectId }),
    [directionId, limit, projectId]
  );

  const read = useGetImpact(input);
  const writer = useRunImpact();
  const { run } = writer;

  const start = useCallback(
    (phase: "baseline" | "compare") => {
      const file = source.trim();

      if (file === "") {
        return;
      }

      startWork(async () => {
        await run({ directionId, file, limit, phase, projectId });
      });
    },
    [directionId, limit, projectId, run, source]
  );

  const handleBaseline = useCallback(() => start("baseline"), [start]);
  const handleCompare = useCallback(() => start("compare"), [start]);
  const canCompare = toCanCompare(read.data, source);
  const error = writer.error ?? read.error;
  const isBusy = isWorking || writer.pending;
  const view = read.data;

  return {
    canCompare,
    error,
    handleBaseline,
    handleCompare,
    isBusy,
    view,
  };
};

export { useImpact };
