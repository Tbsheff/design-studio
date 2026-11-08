import type { Input } from "@design-studio/actions/_core/action";
import type { createRouteFrameCanvas } from "@design-studio/actions/canvas/create-route-frame";
import { Effect } from "effect";

import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type CreateRouteFrameCanvasInput = Input<typeof createRouteFrameCanvas>;

const handle = Effect.fn("canvas.createRouteFrame")(function* run(
  input: CreateRouteFrameCanvasInput
) {
  const writer = yield* CanvasWriter;

  return yield* writer.createRouteFrame(input);
}) satisfies Handle<typeof createRouteFrameCanvas>;

export { handle };
