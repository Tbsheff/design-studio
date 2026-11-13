import type { Input } from "@design-studio/actions/_core/action";
import type { createStateFramesCanvas } from "@design-studio/actions/canvas/create-state-frames";
import { Effect } from "effect";

import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type CreateStateFramesCanvasInput = Input<typeof createStateFramesCanvas>;

const handle = Effect.fn("canvas.createStateFrames")(function* run(
  input: CreateStateFramesCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.createStateFrames({
    frame: input.frame,
    projectId: input.projectId,
    states: input.states,
  });
}) satisfies Handle<typeof createStateFramesCanvas>;

export { handle };
