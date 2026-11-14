import type { StateRun } from "@design-studio/actions/run/states/schema";

import { isSequenceActive, toStoppedRest } from "./engine/to-next-state.js";

const sequences = new Map<string, StateRun>();

const toStateRunKey = (projectId: string, sequenceId: string): string =>
  `${projectId}/${sequenceId}`;

const getStateRun = (projectId: string, sequenceId: string): StateRun | null =>
  sequences.get(toStateRunKey(projectId, sequenceId)) ?? null;

const setStateRun = (projectId: string, run: StateRun): void => {
  sequences.set(toStateRunKey(projectId, run.sequenceId), run);
};

const isStateRunActive = (projectId: string, sequenceId: string): boolean => {
  const run = getStateRun(projectId, sequenceId);

  return run !== null && isSequenceActive(run.items);
};

const stopStateRunOf = (projectId: string, runId: string): boolean => {
  const prefix = toStateRunKey(projectId, "");

  for (const [key, run] of sequences) {
    if (
      key.startsWith(prefix) &&
      run.items.some((item) => item.runId === runId)
    ) {
      sequences.set(key, { ...run, items: toStoppedRest(run.items) });

      return true;
    }
  }

  return false;
};

export { getStateRun, isStateRunActive, setStateRun, stopStateRunOf };
