import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { updateFrameSessionCanvas } from "../../../shared/actions/canvas/update-frame-session.js";
import { CanvasWriter } from "../../canvas/canvas-writer.js";
import type { Handle } from "../_core/handler.js";

type UpdateFrameSessionCanvasInput = Input<typeof updateFrameSessionCanvas>;

const handle = Effect.fn("canvas.updateFrameSession")(function* run(
  input: UpdateFrameSessionCanvasInput
) {
  const service = yield* CanvasWriter;

  return yield* service.updateFrameSession(input);
}) satisfies Handle<typeof updateFrameSessionCanvas>;

export { handle };
