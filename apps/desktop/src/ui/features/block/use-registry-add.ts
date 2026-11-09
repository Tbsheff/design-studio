import { useCallback, useState, useTransition } from "react";

import { toImportInput } from "./block-model.js";
import type { ImportOutput } from "./block-model.js";
import { componentRoutes, useAction } from "./deps.js";

interface RegistryAddSetup {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface RegistryAdd {
  readonly error: string | null;
  readonly handleAdd: (name: string) => void;
  readonly isBusy: boolean;
  readonly result: ImportOutput | null;
}

const useRegistryAdd = (setup: RegistryAddSetup): RegistryAdd => {
  const { directionId, projectId } = setup;
  const [result, setResult] = useState<ImportOutput | null>(null);
  const [isBusy, startWork] = useTransition();
  const importer = useAction(componentRoutes.importComponent);
  const { run } = importer;

  const handleAdd = useCallback(
    (name: string): void => {
      startWork(async () => {
        const done = await run(toImportInput(projectId, directionId, name));

        setResult(done);
      });
    },
    [directionId, projectId, run]
  );

  return {
    error: importer.error?.message ?? null,
    handleAdd,
    isBusy,
    result,
  };
};

export { useRegistryAdd };

export type { RegistryAdd, RegistryAddSetup };
