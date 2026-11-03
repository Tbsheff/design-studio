import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listFlowParamsCanvas } from "../../../shared/actions/canvas/list-flow-params.js";
import { CanvasStore } from "../../canvas/canvas-store.js";
import type { Handle } from "../_core/handler.js";

type ListFlowParamsCanvasInput = Input<typeof listFlowParamsCanvas>;

const handle = Effect.fn("canvas.listFlowParams")(function* run(
  input: ListFlowParamsCanvasInput
) {
  const service = yield* CanvasStore;

  return yield* service.flowParams(input.projectId);
}) satisfies Handle<typeof listFlowParamsCanvas>;

export { handle };
