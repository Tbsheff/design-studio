import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setDocCanvas } from "../../../shared/actions/canvas/set-doc.js";
import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type SetDocCanvasInput = Input<typeof setDocCanvas>;

const handle = Effect.fn("canvas.setDoc")(function* run(
  input: SetDocCanvasInput
) {
  const service = yield* CanvasWriter;

  return yield* service.setDoc(input);
}) satisfies Handle<typeof setDocCanvas>;

export { handle };
