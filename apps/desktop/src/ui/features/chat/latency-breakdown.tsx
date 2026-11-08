import type { ReactElement } from "react";

import { LatencyLoader } from "./latency-loader.js";
import type { RunView } from "./run-state-model.js";

const LatencyBreakdown = ({
  projectId,
  run,
}: {
  projectId: string;
  run: RunView;
}): ReactElement | null => (
  <LatencyLoader
    key={`${run.runId}:${run.summary?.finishedAt ?? ""}`}
    projectId={projectId}
    run={run}
  />
);

export { LatencyBreakdown };
