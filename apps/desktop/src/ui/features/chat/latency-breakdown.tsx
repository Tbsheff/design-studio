import type { TelemetrySample } from "@design-studio/contracts";
import { useEffect, useState, startTransition } from "react";
import type { ReactElement } from "react";

import { api } from "../../api.js";
import { formatMs } from "../../domain/format.js";
import { copy } from "./copy.js";
import type { RunView } from "./run-state-model.js";

const FILE_WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);
const PREVIEW_GRACE_MS = 15_000;
const LONG_FRAME_FLUSH_GRACE_MS = 6000;

const fileWriteMs = (run: RunView): number =>
  run.tools.reduce((sum, tool) => {
    if (FILE_WRITE_TOOLS.has(tool.name) && !tool.isError) {
      return sum + (tool.durationMs ?? 0);
    }
    return sum;
  }, 0);

const firstWriteAt = (run: RunView): number | null => {
  const starts = run.tools
    .filter((tool) => FILE_WRITE_TOOLS.has(tool.name))
    .map((tool) => tool.startedAt);

  if (starts.length > 0) {
    return Math.min(...starts);
  }
  return null;
};

const previewSamplesForRun = (
  samples: TelemetrySample[],
  run: RunView
): TelemetrySample[] => {
  const from = firstWriteAt(run);
  const finishedAt = run.summary?.finishedAt ?? null;

  if (from === null || finishedAt === null) {
    return [];
  }

  return samples.filter(
    (sample) =>
      sample.kind === "preview.latency" &&
      (sample.directionId === undefined ||
        sample.directionId === run.directionId) &&
      sample.ts >= from &&
      sample.ts <= finishedAt + PREVIEW_GRACE_MS
  );
};

const previewText = (samples: TelemetrySample[] | null): string => {
  if (samples === null) {
    return "loading";
  }

  if (samples.length === 0) {
    return "n/a";
  }

  const last = samples.at(-1) as TelemetrySample;
  const max = Math.max(...samples.map((sample) => sample.ms));

  if (samples.length === 1) {
    return formatMs(last.ms);
  }
  return `${formatMs(last.ms)} last, ${formatMs(max)} max (${samples.length} updates)`;
};

const firstTokenText = (
  samples: TelemetrySample[] | null,
  runId: string
): string => {
  if (samples === null) {
    return "loading";
  }

  const ofRun = samples.filter(
    (sample) =>
      sample.kind === "run.first_token" && sample.detail?.runId === runId
  );

  const visible = ofRun.find((sample) => sample.detail?.stage === "visible");
  const server = ofRun.find((sample) => sample.detail?.stage === "server");

  if (!visible && !server) {
    return "n/a";
  }

  if (visible && server) {
    return `${formatMs(visible.ms)} (server ${formatMs(server.ms)})`;
  }

  return formatMs((visible ?? server)?.ms ?? 0);
};

const longFramesText = (
  samples: TelemetrySample[] | null,
  run: RunView
): string => {
  if (samples === null) {
    return "loading";
  }

  const finishedAt = run.summary?.finishedAt ?? null;

  if (finishedAt === null) {
    return "n/a";
  }

  const during = samples.filter(
    (sample) =>
      sample.kind === "frame.long" &&
      sample.ts >= run.startedAt &&
      sample.ts <= finishedAt + LONG_FRAME_FLUSH_GRACE_MS
  );

  const count = during.reduce(
    (sum, sample) =>
      sum +
      (typeof sample.detail?.count === "number" ? sample.detail.count : 1),
    0
  );

  if (count === 0) {
    return "none";
  }

  return `${count}, longest ${formatMs(Math.max(...during.map((sample) => sample.ms)))}`;
};

const LatencyBreakdown = ({
  projectId,
  run,
}: {
  projectId: string;
  run: RunView;
}): ReactElement | null => {
  const [samples, setSamples] = useState<TelemetrySample[] | null>(null);
  const finishedAt = run.summary?.finishedAt ?? null;

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
  }, [projectId, run.runId, finishedAt]);

  const runSummary = run.summary;

  if (!runSummary) {
    return null;
  }

  const rows: [string, string][] = [
    ["Model", formatMs(runSummary.modelMs)],
    ["Tools", formatMs(runSummary.toolMs)],
    ["File writes", formatMs(fileWriteMs(run))],
    ["First token", firstTokenText(samples, run.runId)],
    [
      "Preview update",
      previewText(samples === null ? null : previewSamplesForRun(samples, run)),
    ],
    ["Long frames", longFramesText(samples, run)],
  ];

  return (
    <>
      <h4>{copy.latency}</h4>
      <dl className="kv" aria-label={copy.latencyBreakdown}>
        {rows.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
};

export { LatencyBreakdown };
