import { useMemo } from "react";
import type { ReactElement } from "react";

import type { Segment } from "./run-segments-model.js";
import type { RunView } from "./run-state-model.js";
import { SegmentList } from "./segment-list.js";
import { toWaitingIds } from "./tool-chips-model.js";
import { ToolSummary } from "./tool-summary.js";

const StepsSummary = ({
  run,
  steps,
  running,
  workTree,
}: {
  run: RunView;
  steps: Segment[];
  running: boolean;
  workTree: string | null;
}): ReactElement | null => {
  const { permissions } = run;
  const waitingIds = useMemo(() => toWaitingIds(permissions), [permissions]);

  if (steps.length === 0) {
    return null;
  }

  return (
    <ToolSummary tools={run.tools} waitingIds={waitingIds}>
      <SegmentList segments={steps} running={running} workTree={workTree} />
    </ToolSummary>
  );
};

export { StepsSummary };
