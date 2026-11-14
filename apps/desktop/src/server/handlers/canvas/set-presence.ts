import type { Input } from "@design-studio/actions/_core/action";
import type { setPresenceCanvas } from "@design-studio/actions/canvas/set-presence";
import { Effect } from "effect";

import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";
import { toWritable } from "../_core/writable.js";

type SetPresenceCanvasInput = Input<typeof setPresenceCanvas>;

const handle = Effect.fn("canvas.setPresence")(function* run(
  input: SetPresenceCanvasInput
) {
  const service = yield* CanvasWriter;

  return yield* service.setPresence(toWritable(input));
}) satisfies Handle<typeof setPresenceCanvas>;

export { handle };
