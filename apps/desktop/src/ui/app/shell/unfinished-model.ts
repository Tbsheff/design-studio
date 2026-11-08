import type { RunStatus, Version } from "@design-studio/contracts";

const STOPPED: ReadonlySet<RunStatus> = new Set([
  "canceled",
  "failed",
  "budget_exceeded",
]);

const runStoppedUnsaved = (
  runs: readonly { startedAt: number; status: RunStatus }[],
  versions: readonly Version[]
): boolean => {
  let head = 0;

  for (const version of versions) {
    head = Math.max(head, version.createdAt);
  }

  return runs.some((run) => run.startedAt > head && STOPPED.has(run.status));
};

export { runStoppedUnsaved };
