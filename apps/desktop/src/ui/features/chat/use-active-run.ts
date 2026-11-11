import { useEffect, useState } from "react";

import { START_GRACE_MS, hasRunOutput, isLiveRun } from "./run-state-model.js";
import type { RunView } from "./run-state-model.js";

const toWaitingRun = (runs: readonly RunView[]): RunView | null =>
  runs.find((run) => run.status === "running" && !hasRunOutput(run)) ?? null;

const useActiveRun = (runs: readonly RunView[]): RunView | null => {
  const [now, setNow] = useState(() => Date.now());
  const waiting = toWaitingRun(runs);
  const waitingStart = waiting?.startedAt ?? null;

  useEffect(() => {
    if (waitingStart === null) {
      return;
    }

    const wait = Math.max(0, waitingStart + START_GRACE_MS - Date.now());
    const id = globalThis.setTimeout(() => setNow(Date.now()), wait + 1);

    return (): void => globalThis.clearTimeout(id);
  }, [waitingStart]);

  return runs.find((run) => isLiveRun(run, now)) ?? null;
};

export { useActiveRun };
