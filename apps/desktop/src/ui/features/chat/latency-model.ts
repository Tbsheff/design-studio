import type { RunSummary, TelemetrySample } from "@design-studio/contracts";

import { formatMs } from "../../domain/format.js";
import type { RunView } from "./run-state-model.js";

const FILE_WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);
const PREVIEW_GRACE_MS = 15_000;
const LONG_FRAME_FLUSH_GRACE_MS = 6000;

const fileWriteMs = (run: RunView): number => {
  let total = 0;

  for (const tool of run.tools) {
    if (FILE_WRITE_TOOLS.has(tool.name) && !tool.isError) {
      total += tool.durationMs ?? 0;
    }
  }

  return total;
};

const firstWriteAt = (run: RunView): number | null => {
  const starts: number[] = [];

  for (const tool of run.tools) {
    if (FILE_WRITE_TOOLS.has(tool.name)) {
      starts.push(tool.startedAt);
    }
  }

  if (starts.length > 0) {
    return Math.min(...starts);
  }

  return null;
};

const isRunDirection = (sample: TelemetrySample, run: RunView): boolean =>
  !sample.directionId || sample.directionId === run.directionId;

const previewSamplesForRun = (
  samples: TelemetrySample[],
  run: RunView
): TelemetrySample[] => {
  const from = firstWriteAt(run);
  const finishedAt = run.summary?.finishedAt ?? null;

  if (from === null || finishedAt === null) {
    return [];
  }

  const until = finishedAt + PREVIEW_GRACE_MS;

  return samples.filter(
    (sample) =>
      sample.kind === "preview.latency" &&
      isRunDirection(sample, run) &&
      sample.ts >= from &&
      sample.ts <= until
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

  let count = 0;

  for (const sample of during) {
    const reported = Number(sample.detail?.count);
    let added = 1;

    if (!Number.isNaN(reported)) {
      added = reported;
    }

    count += added;
  }

  if (count === 0) {
    return "none";
  }

  return `${count}, longest ${formatMs(Math.max(...during.map((sample) => sample.ms)))}`;
};

const toPreviewSamples = (
  samples: TelemetrySample[] | null,
  run: RunView
): TelemetrySample[] | null => {
  if (samples === null) {
    return null;
  }

  return previewSamplesForRun(samples, run);
};

const toLatencyRows = (
  samples: TelemetrySample[] | null,
  run: RunView,
  summary: RunSummary
): [string, string][] => [
  ["Model", formatMs(summary.modelMs)],
  ["Tools", formatMs(summary.toolMs)],
  ["File writes", formatMs(fileWriteMs(run))],
  ["First token", firstTokenText(samples, run.runId)],
  ["Preview update", previewText(toPreviewSamples(samples, run))],
  ["Long frames", longFramesText(samples, run)],
];

export { toLatencyRows };
