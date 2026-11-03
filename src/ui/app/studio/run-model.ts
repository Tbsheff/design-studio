import { runStepText } from "../../components/ToolChips";
import type { RunView } from "../../runState";

const runById = <Run>(
  runs: Record<string, Run>,
  id: string | null
): Run | null => {
  if (!id) {
    return null;
  }

  return runs[id] ?? null;
};

const neverRan = (runsLoaded: boolean, runs: readonly unknown[]): boolean =>
  runsLoaded && runs.length === 0;

const runStepOf = (
  run: RunView | null,
  direction: { workTree: string } | null | undefined
): string | null => runStepText(run, direction?.workTree ?? null);

export { neverRan, runById, runStepOf };
