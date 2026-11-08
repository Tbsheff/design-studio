import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import type { AttentionResultSchema } from "@design-studio/actions/critique/schema";
import { Effect } from "effect";

import { attemptKnown } from "../../platform/attempt/index.js";
import type { ViewportRuntime } from "../../viewport/index.js";
import { loadTarget } from "../critique-target.js";
import { runAttentionCapture } from "./attention-capture.js";
import { toRenderFailure } from "./attention-failure.js";
import { createHeatmapFile, toHeatmapPath } from "./attention-heatmap.js";
import { createSavedAttention } from "./attention-saved-write.js";
import { toSavedPath } from "./attention-saved.js";
import { toAttentionMap, toHeatOverlay } from "./engine/index.js";
import type { AttentionMap } from "./engine/index.js";

type AttentionResult = typeof AttentionResultSchema.Type;

interface RunAttentionCommand {
  readonly directionId: string;
  readonly frameId: string;
  readonly layerId: string | null;
  readonly projectId: string;
  readonly width: number;
}

const TOP_COUNT = 8;

const toResult = (
  frame: string,
  file: string,
  map: AttentionMap
): AttentionResult => ({
  clarityScore: map.clarityScore,
  frameId: frame,
  heatmapPath: file,
  notes: map.notes.map((note) => ({
    kind: note.kind,
    layerId: note.layerId,
    message: note.message,
  })),
  topElements: map.ranked.slice(0, TOP_COUNT).map((item) => ({
    label: item.element.label || item.element.role,
    layerId: item.element.layerId,
    rank: item.rank,
    selector: item.element.selector,
    share: item.share,
  })),
});

const runAttention = Effect.fn("runAttention")(function* run(
  runtime: ViewportRuntime,
  command: RunAttentionCommand
) {
  const target = yield* loadTarget(runtime, command);

  const capture = yield* attemptKnown(
    () =>
      runAttentionCapture(runtime.preview, target, {
        layerId: command.layerId,
        width: command.width,
      }),
    toRenderFailure
  );

  const outcome = toAttentionMap(capture);

  if (!outcome.isOk) {
    if (outcome.code === "no_elements") {
      return yield* new NotFound({
        message: "No visible element was found in this frame or layer.",
      });
    }

    return yield* new Unavailable({
      message: "The render gave an empty picture. Run the check again.",
    });
  }

  const key = { ...command, frameId: target.frame.id };

  const heatmapPath = toHeatmapPath(runtime.projectDir(command.projectId), key);

  yield* attemptKnown(() =>
    createHeatmapFile(
      heatmapPath,
      toHeatOverlay(capture.image, outcome.value.grid)
    )
  );

  const result = toResult(target.frame.id, heatmapPath, outcome.value);

  yield* attemptKnown(() =>
    createSavedAttention(toSavedPath(runtime.dataDir, key), result)
  );

  return result;
});

export { runAttention };

export type { AttentionResult, RunAttentionCommand };
