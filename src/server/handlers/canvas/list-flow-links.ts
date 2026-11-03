import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listFlowLinksCanvas } from "../../../shared/actions/canvas/list-flow-links.js";
import { CanvasStore } from "../../canvas/canvas-store.js";
import type { Handle } from "../_core/handler.js";

type ListFlowLinksCanvasInput = Input<typeof listFlowLinksCanvas>;

const handle = Effect.fn("canvas.listFlowLinks")(function* run(
  input: ListFlowLinksCanvasInput
) {
  const service = yield* CanvasStore;

  return yield* service.flowLinks(input.projectId, input.route);
}) satisfies Handle<typeof listFlowLinksCanvas>;

export { handle };
