import type { Input } from "@design-studio/actions/_core/action";
import type { moveFramesCanvas } from "@design-studio/actions/canvas/move-frames";
import { Effect } from "effect";

import { FrameTidyWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type MoveFramesCanvasInput = Input<typeof moveFramesCanvas>;

const handle = Effect.fn("canvas.moveFrames")(function* run(
  input: MoveFramesCanvasInput
) {
  const writer = yield* FrameTidyWriter;

  return yield* writer.moveFrames({
    directionId: input.directionId ?? null,
    frames: input.frames,
    gap: input.gap,
    layout: input.layout,
    projectId: input.projectId,
    section: input.section,
  });
}) satisfies Handle<typeof moveFramesCanvas>;

export { handle };
