import type { Input } from "@design-studio/actions/_core/action";
import type { setPointCanvas } from "@design-studio/actions/canvas/set-point";
import { Effect } from "effect";

import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type SetPointCanvasInput = Input<typeof setPointCanvas>;

const handle = Effect.fn("canvas.setPoint")(function* run(
  input: SetPointCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.setPoint({
    directionId: input.directionId ?? null,
    frame: input.frame,
    projectId: input.projectId,
    selector: input.selector ?? null,
  });
}) satisfies Handle<typeof setPointCanvas>;

export { handle };
