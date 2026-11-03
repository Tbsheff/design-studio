import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createFlowCanvas } from "../../../shared/actions/canvas/create-flow.js";
import { CanvasWriter } from "../../canvas/canvas-writer.js";
import type { Handle } from "../_core/handler.js";

type CreateFlowCanvasInput = Input<typeof createFlowCanvas>;

const handle = Effect.fn("canvas.createFlow")(function* run(
  input: CreateFlowCanvasInput
) {
  const service = yield* CanvasWriter;

  return yield* service.createFlow(input);
}) satisfies Handle<typeof createFlowCanvas>;

export { handle };
