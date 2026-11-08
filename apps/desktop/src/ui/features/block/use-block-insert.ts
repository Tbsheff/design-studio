import { useCallback, useState, useTransition } from "react";

import { toInsertInput } from "./block-model.js";
import type { InsertOutput } from "./block-model.js";
import { blockRoutes, useAction } from "./deps.js";

interface BlockInsertSetup {
  readonly directionId: string | null;
  readonly projectId: string;
  readonly selectionSource: string | null;
}

interface BlockInsert {
  readonly error: string | null;
  readonly handleInsert: (blockId: string) => void;
  readonly isBusy: boolean;
  readonly result: InsertOutput | null;
}

const useBlockInsert = (setup: BlockInsertSetup): BlockInsert => {
  const { directionId, projectId, selectionSource } = setup;
  const [result, setResult] = useState<InsertOutput | null>(null);
  const [isBusy, startWork] = useTransition();
  const inserter = useAction(blockRoutes.insertBlock);
  const { run } = inserter;

  const handleInsert = useCallback(
    (blockId: string): void => {
      startWork(async () => {
        const done = await run(
          toInsertInput(projectId, directionId, blockId, selectionSource)
        );

        setResult(done);
      });
    },
    [directionId, projectId, run, selectionSource]
  );

  return {
    error: inserter.error?.message ?? null,
    handleInsert,
    isBusy,
    result,
  };
};

export { useBlockInsert };

export type { BlockInsert, BlockInsertSetup };
