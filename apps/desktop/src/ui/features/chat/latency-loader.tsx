import type { TelemetrySample } from "@design-studio/contracts";
import { useEffect, useState, startTransition } from "react";
import type { ReactElement } from "react";

import { api } from "../../api.js";
import { copy } from "./copy.js";
import { LatencyRows } from "./latency-rows.js";
import type { RunView } from "./run-state-model.js";

const LatencyLoader = ({
  projectId,
  run,
}: {
  projectId: string;
  run: RunView;
}): ReactElement | null => {
  const [samples, setSamples] = useState<TelemetrySample[] | null>(null);

  useEffect(() => {
    let alive = true;
    startTransition(async () => {
      try {
        const list = await api.getTelemetry(projectId);

        if (alive) {
          setSamples(list);
        }
      } catch {
        if (alive) {
          setSamples([]);
        }
      }
    });

    return (): void => {
      alive = false;
    };
  }, [projectId]);

  const runSummary = run.summary;

  if (!runSummary) {
    return null;
  }

  return (
    <>
      <h4>{copy.latency}</h4>
      <LatencyRows samples={samples} run={run} summary={runSummary} />
    </>
  );
};

export { LatencyLoader };
