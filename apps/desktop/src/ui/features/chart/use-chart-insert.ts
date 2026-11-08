import { useCallback, useState, useTransition } from "react";

import { toInsertInput } from "./chart-model.js";
import type { ChartDraft, InsertInput, InsertOutput } from "./chart-model.js";
import { chartRoutes, useAction } from "./deps.js";

interface ChartInsertSetup {
  readonly directionId: string | null;
  readonly draft: ChartDraft;
  readonly layerId: string | null;
  readonly projectId: string;
}

interface ChartInsert {
  readonly error: string | null;
  readonly handleInsert: () => void;
  readonly isBusy: boolean;
  readonly isReady: boolean;
  readonly result: InsertOutput | null;
}

const MAIN_DIRECTION = "main";

const useChartInsert = (setup: ChartInsertSetup): ChartInsert => {
  const { directionId, draft, layerId, projectId } = setup;
  const [result, setResult] = useState<InsertOutput | null>(null);
  const [isBusy, startWork] = useTransition();
  const inserter = useAction(chartRoutes.insertChart);
  const { run } = inserter;
  const ids = { directionId: directionId ?? MAIN_DIRECTION, projectId };
  let input: InsertInput | null = null;

  if (layerId !== null) {
    input = toInsertInput(draft, ids, layerId);
  }

  const isReady = input !== null;

  const handleInsert = useCallback((): void => {
    if (input === null) {
      return;
    }

    startWork(async () => {
      const done = await run(input);

      setResult(done);
    });
  }, [input, run]);

  return {
    error: inserter.error?.message ?? null,
    handleInsert,
    isBusy,
    isReady,
    result,
  };
};

export { useChartInsert };

export type { ChartInsert, ChartInsertSetup };
