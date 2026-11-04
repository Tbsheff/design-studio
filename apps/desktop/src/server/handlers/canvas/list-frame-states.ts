import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listFrameStatesCanvas } from "../../../shared/actions/canvas/list-frame-states.js";
import { CanvasStore } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type ListFrameStatesCanvasInput = Input<typeof listFrameStatesCanvas>;

const handle = Effect.fn("canvas.listFrameStates")(function* run(
  input: ListFrameStatesCanvasInput
) {
  const service = yield* CanvasStore;

  return yield* service.frameStates(input.projectId);
}) satisfies Handle<typeof listFrameStatesCanvas>;

export { handle };
