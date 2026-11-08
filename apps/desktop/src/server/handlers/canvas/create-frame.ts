import type { Input } from "@design-studio/actions/_core/action";
import type { createFrameCanvas } from "@design-studio/actions/canvas/create-frame";
import { Effect } from "effect";

import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type CreateFrameCanvasInput = Input<typeof createFrameCanvas>;

const handle = Effect.fn("canvas.createFrame")(function* run(
  input: CreateFrameCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.createFrame({
    ...input,
    directionId: input.directionId ?? null,
  });
}) satisfies Handle<typeof createFrameCanvas>;

export { handle };
