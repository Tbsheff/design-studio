import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setFrameStateCanvas } from "../../../shared/actions/canvas/set-frame-state.js";
import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";
import { toWritable } from "../_core/writable.js";

type SetFrameStateCanvasInput = Input<typeof setFrameStateCanvas>;

const handle = Effect.fn("canvas.setFrameState")(function* run(
  input: SetFrameStateCanvasInput
) {
  const service = yield* CanvasWriter;

  return yield* service.setFrameState(toWritable(input));
}) satisfies Handle<typeof setFrameStateCanvas>;

export { handle };
