import { useMemo } from "react";
import type { ReactElement } from "react";

import { layoutOf, segmentsOf } from "./run-segments-model.js";
import type { RunView } from "./run-state-model.js";
import { SegmentList } from "./segment-list.js";
import { StepsSummary } from "./steps-summary.js";

const RunParts = ({
  run,
  running,
  workTree,
}: {
  run: RunView;
  running: boolean;
  workTree: string | null;
}): ReactElement => {
  const layout = useMemo(
    () => layoutOf(segmentsOf(run), running),
    [run, running]
  );

  return (
    <>
      <StepsSummary
        run={run}
        steps={layout.steps}
        running={running}
        workTree={workTree}
      />
      <SegmentList
        segments={layout.sent}
        running={running}
        workTree={workTree}
      />
      <SegmentList
        segments={layout.tail}
        running={running}
        workTree={workTree}
      />
    </>
  );
};

export { RunParts };
