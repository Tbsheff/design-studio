import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import { createCursor, toLoadedCount } from "./run-cursor-model.js";
import { runFillFirst, isRunReached } from "./run-pager-model.js";
import type { RunPager } from "./run-pager-model.js";
import type { RunPorts } from "./run-ports-model.js";
import { FIRST_RUNS } from "./studio-data-model.js";

const IDLE_CURSOR = createCursor("");

interface RunPagesInput<Runs> {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly ports: RunPorts<Runs>;
  readonly setRuns: Dispatch<SetStateAction<Runs>>;
  readonly setLoadedFor: (projectId: string) => void;
}

const useRunPages = <Runs>(input: RunPagesInput<Runs>): void => {
  const { projectId, directionId, ports, setRuns, setLoadedFor } = input;
  const cursor = useRef(IDLE_CURSOR);
  const direction = useRef(directionId);

  const pager = useMemo<RunPager<Runs>>(
    () => ({ cursor, direction, ports, setLoadedFor, setRuns }),
    [ports, setLoadedFor, setRuns]
  );

  const through = useCallback(
    (runId: string): Promise<boolean> => isRunReached(pager, runId),
    [pager]
  );

  useEffect(() => {
    direction.current = directionId;
  }, [directionId]);

  useEffect(() => {
    ports.publishHistory({ projectId, through });

    return (): void => ports.publishHistory(null);
  }, [ports, projectId, through]);

  useEffect(() => {
    const fresh = createCursor(projectId);
    cursor.current = fresh;
    runFillFirst(pager, fresh);

    return (): void => {
      if (cursor.current === fresh) {
        cursor.current = createCursor(projectId);
      }

      ports.publishOlder(false, false, null);
    };
  }, [ports, projectId, pager]);

  useEffect(() => {
    const { current } = cursor;

    if (
      directionId !== null &&
      !current.state.current.isLoading &&
      toLoadedCount(current, directionId) < FIRST_RUNS
    ) {
      runFillFirst(pager, current);
    }
  }, [directionId, pager]);
};

export { useRunPages };
