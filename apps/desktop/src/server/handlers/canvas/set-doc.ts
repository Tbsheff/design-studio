import type { Input } from "@design-studio/actions/_core/action";
import type { setDocCanvas } from "@design-studio/actions/canvas/set-doc";
import { Effect } from "effect";

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
