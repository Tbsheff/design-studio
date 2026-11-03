import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setPresenceCanvas } from "../../../shared/actions/canvas/set-presence.js";
import { CanvasWriter } from "../../canvas/canvas-writer.js";
import type { Handle } from "../_core/handler.js";

type SetPresenceCanvasInput = Input<typeof setPresenceCanvas>;

const handle = Effect.fn("canvas.setPresence")(function* run(
  input: SetPresenceCanvasInput
) {
  const service = yield* CanvasWriter;

  return yield* service.setPresence(input);
}) satisfies Handle<typeof setPresenceCanvas>;

export { handle };
