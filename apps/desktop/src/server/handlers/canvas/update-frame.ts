import type { Input } from "@design-studio/actions/_core/action";
import type { updateFrameCanvas } from "@design-studio/actions/canvas/update-frame";
import { Effect } from "effect";

import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateFrameCanvasInput = Input<typeof updateFrameCanvas>;

const handle = Effect.fn("canvas.updateFrame")(function* run(
  input: UpdateFrameCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.updateFrames({
    directionId: input.directionId ?? null,
    frames: input.frames,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof updateFrameCanvas>;

export { handle };
