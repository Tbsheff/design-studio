import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { updateFrameSessionCanvas } from "@design-studio/actions/canvas/update-frame-session";
import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateFrameSessionCanvasInput = Input<typeof updateFrameSessionCanvas>;

const handle = Effect.fn("canvas.updateFrameSession")(function* run(
  input: UpdateFrameSessionCanvasInput
) {
  const service = yield* CanvasWriter;

  return yield* service.updateFrameSession(input);
}) satisfies Handle<typeof updateFrameSessionCanvas>;

export { handle };
