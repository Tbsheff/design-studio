import type { Input } from "@design-studio/actions/_core/action";
import type { createFlowCanvas } from "@design-studio/actions/canvas/create-flow";
import { Effect } from "effect";

import { CanvasWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type CreateFlowCanvasInput = Input<typeof createFlowCanvas>;

const handle = Effect.fn("canvas.createFlow")(function* run(
  input: CreateFlowCanvasInput
) {
  const service = yield* CanvasWriter;

  return yield* service.createFlow(input);
}) satisfies Handle<typeof createFlowCanvas>;

export { handle };
