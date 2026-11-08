import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import type { LocalOrgScope } from "../../store/index.js";
import type { DevNoteFrame } from "./dev-note-frame.js";
import { getMeasured } from "./dev-note-measure.js";
import type { MeasuredNote } from "./engine/to-note-record.js";

type MeasureFailure = BadRequest | Conflict | NotFound;

type GetFrame = (
  projectId: string,
  frameId: string
) => Effect.Effect<DevNoteFrame, MeasureFailure, LocalOrgScope>;

interface MeasureTarget {
  readonly isMeasured: boolean;
  readonly frameId: string;
  readonly layerId: string | null;
  readonly projectId: string;
}

const toSourceText = (
  source: { readonly file: string; readonly line: number } | null
): string | null => {
  if (source === null) {
    return null;
  }

  return `${source.file}:${source.line}`;
};

const toMeasureNote = Effect.fn("DevNoteMeasure.note")(function* run(
  getFrame: GetFrame,
  target: MeasureTarget
) {
  if (!target.isMeasured) {
    return null;
  }

  if (target.layerId === null) {
    return yield* new BadRequest({
      message:
        "Pass layerId to measure a layer. Call get_layers for the layer ids.",
    });
  }

  const frame = yield* getFrame(target.projectId, target.frameId);

  const measured = yield* getMeasured({
    directionId: frame.directionId,
    framePath: frame.path,
    frameSize: frame.size,
    layerId: target.layerId,
    projectId: target.projectId,
  });

  const note: MeasuredNote = {
    measurements: measured.measurements,
    source: toSourceText(measured.source),
  };

  return note;
});

export { toMeasureNote };

export type { GetFrame, MeasureTarget };
