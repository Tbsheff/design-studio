import type { Input } from "@design-studio/actions/_core/action";
import type { inspectCanvas } from "@design-studio/actions/canvas/inspect";
import { Effect } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type InspectCanvasInput = Input<typeof inspectCanvas>;

const handle = Effect.fn("canvas.inspect")(function* run(
  input: InspectCanvasInput
) {
  const store = yield* CanvasStore;

  return yield* store.inspectFrames({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof inspectCanvas>;

export { handle };
