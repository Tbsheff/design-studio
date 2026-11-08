import type { RunSummary, TelemetrySample } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toLatencyRows } from "./latency-model.js";
import type { RunView } from "./run-state-model.js";

const LatencyRows = ({
  samples,
  run,
  summary,
}: {
  samples: TelemetrySample[] | null;
  run: RunView;
  summary: RunSummary;
}): ReactElement => (
  <dl className="kv" aria-label={copy.latencyBreakdown}>
    {toLatencyRows(samples, run, summary).map(([name, value]) => (
      <div key={name}>
        <dt>{name}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

export { LatencyRows };
