import type { Input } from "@design-studio/actions/_core/action";
import type { listFlowParamsCanvas } from "@design-studio/actions/canvas/list-flow-params";
import { Effect } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type ListFlowParamsCanvasInput = Input<typeof listFlowParamsCanvas>;

const handle = Effect.fn("canvas.listFlowParams")(function* run(
  input: ListFlowParamsCanvasInput
) {
  const service = yield* CanvasStore;

  return yield* service.flowParams(input.projectId);
}) satisfies Handle<typeof listFlowParamsCanvas>;

export { handle };
