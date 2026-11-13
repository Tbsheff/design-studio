import type { Input } from "@design-studio/actions/_core/action";
import type { setLayoutGridCanvas } from "@design-studio/actions/canvas/set-layout-grid";
import { Effect } from "effect";

import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type SetLayoutGridCanvasInput = Input<typeof setLayoutGridCanvas>;

const handle = Effect.fn("canvas.setLayoutGrid")(function* run(
  input: SetLayoutGridCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.setLayoutGrid({
    directionId: input.directionId ?? null,
    frame: input.frame,
    layoutGrid: input.layoutGrid,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof setLayoutGridCanvas>;

export { handle };
