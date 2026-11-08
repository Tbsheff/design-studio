import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { Effect } from "effect";

import { runDirectionRead } from "../direct-edit/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import { composeSheet } from "../viewport/index.js";
import { toAccessibilityFailure } from "./accessibility-failure.js";
import { VISION_KINDS } from "./engine/vision-matrix.js";
import type { VisionKind } from "./engine/vision-matrix.js";
import { runVisionCapture } from "./vision-page.js";
import type { VisionPlan } from "./vision-page.js";
import { toVisionCells, toVisionConfused } from "./vision-report.js";
import type { VisionReport } from "./vision-report.js";
import { getVisionTarget } from "./vision-target.js";
import type { VisionTargetRequest } from "./vision-target.js";

interface RunVisionCommand extends VisionTargetRequest {
  readonly kinds: readonly VisionKind[];
  readonly projectId: string;
}

const DEFAULT_DIRECTION = "main";

const KEY_LENGTH = 12;

const toRunKey = (
  command: RunVisionCommand,
  kinds: readonly VisionKind[]
): string =>
  createHash("sha1")
    .update(JSON.stringify([command.frameId, command.layer, kinds]))
    .digest("hex")
    .slice(0, KEY_LENGTH);

const toKinds = (kinds: readonly VisionKind[]): VisionKind[] =>
  VISION_KINDS.filter((kind) => kinds.includes(kind));

const toPlan = (
  dir: string,
  stamp: string,
  kinds: readonly VisionKind[]
): VisionPlan => ({
  files: kinds.map((kind) => ({
    file: path.join(dir, `${stamp}-${kind}.png`),
    kind,
  })),
  original: path.join(dir, `${stamp}-original.png`),
});

const runVision = Effect.fn("runVision")(function* run(
  command: RunVisionCommand
) {
  const kinds = toKinds(command.kinds);

  const target = yield* runDirectionRead(
    {
      directionId: command.directionId ?? DEFAULT_DIRECTION,
      projectId: command.projectId,
    },
    (loaded) => getVisionTarget(loaded, command),
    toAccessibilityFailure
  );

  const dir = path.join(
    target.runtime.projectDir(target.project.id),
    "checks",
    "vision"
  );

  const stamp = toRunKey(command, kinds);
  const plan = toPlan(dir, stamp, kinds);

  yield* attemptKnown(() => mkdir(dir, { recursive: true }));

  const capture = yield* attemptKnown(
    () => runVisionCapture(target.runtime.preview, target, plan),
    toAccessibilityFailure
  );

  const sheetPath = yield* composeSheet(
    [
      { file: plan.original, row: 0 },
      ...plan.files.map((item) => ({ file: item.file, row: 0 })),
    ],
    path.join(dir, `${stamp}-sheet.png`)
  );

  const files = new Map(plan.files.map((item) => [item.kind, item.file]));

  const report: VisionReport = {
    cells: toVisionCells(kinds, files, capture, {
      entries: target.entries,
      frameId: target.frame.id,
    }),
    confusedPairs: toVisionConfused(kinds, capture),
    frameId: target.frame.id,
    sheetPath,
  };

  return report;
});

export { runVision };

export type { RunVisionCommand };
