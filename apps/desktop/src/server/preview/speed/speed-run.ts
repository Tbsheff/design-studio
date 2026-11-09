import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Effect } from "effect";

import type { McpReadError } from "../mcp-read-core.js";
import { getSpeedRecord, setSpeedRecord } from "./speed-memory.js";
import { toImages, toNumbers } from "./speed-numbers.js";
import type { SpeedResult, SpeedRunQuery, SpeedSample } from "./speed-types.js";

type SpeedSampler = (
  query: SpeedRunQuery
) => Effect.Effect<SpeedSample, McpReadError>;

const toResult = (
  query: SpeedRunQuery,
  sample: SpeedSample,
  baseline: SpeedSample | null
): SpeedResult => ({
  frameId: query.frameId,
  hasBaseline: true,
  images: toImages(sample, baseline),
  isDevBuild: sample.isDevBuild,
  numbers: toNumbers(sample, baseline),
  phase: query.phase,
  route: sample.route,
  runs: sample.runs,
});

const runSpeedPhase = Effect.fn("speed.runPhase")(function* run(
  sample: SpeedSampler,
  query: SpeedRunQuery
) {
  const baseline = getSpeedRecord(query)?.baseline ?? null;

  if (query.phase === "compare" && baseline === null) {
    return yield* new BadRequest({
      message: `Run run_speed with phase baseline on frame ${query.frameId} before the edit, then compare.`,
    });
  }

  const measured = yield* sample(query);

  if (query.phase === "baseline") {
    const last = toResult(query, measured, null);
    setSpeedRecord(query, { baseline: measured, last });

    return last;
  }

  const last = toResult(query, measured, baseline);
  setSpeedRecord(query, { baseline, last });

  return last;
});

export { runSpeedPhase };

export type { SpeedSampler };
