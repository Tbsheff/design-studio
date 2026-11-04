import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { listFrameStatesCanvas } from "@design-studio/actions/canvas/list-frame-states";
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
