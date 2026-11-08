import type { RunRequest } from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { EventBatcher, RunPorts, RunSeed } from "./run-ports-model.js";
import { startSendNote } from "./studio-data-model.js";
import type { SendTimes } from "./studio-data-model.js";
import { useRunPages } from "./use-run-pages.js";

interface RunData<Runs> {
  readonly runs: Runs;
  readonly hasRunsLoaded: boolean;
  readonly batcher: EventBatcher;
  readonly sends: SendTimes;
  readonly setRuns: Dispatch<SetStateAction<Runs>>;
  readonly seedRun: (
    runId: string,
    directionId: string,
    request: RunRequest
  ) => void;
  readonly seedStoppedRun: (
    runId: string,
    directionId: string,
    request: RunRequest
  ) => void;
  readonly noteSend: () => () => void;
}

const toRunSeed = (
  runId: string,
  directionId: string,
  request: RunRequest,
  isStopped: boolean
): RunSeed => {
  const now = Date.now();

  return { directionId, isStopped, now, request, runId };
};

const useRunData = <Runs>(
  projectId: string,
  directionId: string | null,
  ports: RunPorts<Runs>
): RunData<Runs> => {
  const [runs, setRuns] = useState<Runs>(ports.initialRuns);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const batcher = useMemo(() => ports.createBatcher(setRuns), [ports]);

  const sends = useMemo<SendTimes>(
    () => ({ byRun: new Map(), pending: { current: null } }),
    []
  );

  useEffect(() => (): void => batcher.dispose(), [batcher]);
  useRunPages({
    directionId,
    ports,
    projectId,
    setLoadedFor,
    setRuns,
  });

  const seedRun = useCallback(
    (runId: string, nextDirectionId: string, request: RunRequest): void =>
      setRuns((previous) =>
        ports.toSeeded(
          previous,
          toRunSeed(runId, nextDirectionId, request, false)
        )
      ),
    [ports]
  );

  const seedStoppedRun = useCallback(
    (runId: string, nextDirectionId: string, request: RunRequest): void =>
      setRuns((previous) =>
        ports.toSeeded(
          previous,
          toRunSeed(runId, nextDirectionId, request, true)
        )
      ),
    [ports]
  );

  const noteSend = useCallback(
    (): (() => void) => startSendNote(sends),
    [sends]
  );

  const hasRunsLoaded = loadedFor === projectId;

  return {
    batcher,
    hasRunsLoaded,
    noteSend,
    runs,
    seedRun,
    seedStoppedRun,
    sends,
    setRuns,
  };
};

export { useRunData };

export type { RunData };
