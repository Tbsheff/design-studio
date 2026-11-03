import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setFrameStateCanvas } from "../../../shared/actions/canvas/set-frame-state.js";
import { CanvasWriter } from "../../canvas/canvas-writer.js";
import type { Handle } from "../_core/handler.js";

type SetFrameStateCanvasInput = Input<typeof setFrameStateCanvas>;

const handle = Effect.fn("canvas.setFrameState")(function* run(
  input: SetFrameStateCanvasInput
) {
  const service = yield* CanvasWriter;

  return yield* service.setFrameState(input);
}) satisfies Handle<typeof setFrameStateCanvas>;

export { handle };
