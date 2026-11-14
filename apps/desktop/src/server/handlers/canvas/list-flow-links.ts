import type { Input } from "@design-studio/actions/_core/action";
import type { listFlowLinksCanvas } from "@design-studio/actions/canvas/list-flow-links";
import { Effect } from "effect";

import { CanvasStore } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type ListFlowLinksCanvasInput = Input<typeof listFlowLinksCanvas>;

const handle = Effect.fn("canvas.listFlowLinks")(function* run(
  input: ListFlowLinksCanvasInput
) {
  const service = yield* CanvasStore;

  return yield* service.flowLinks(input.projectId, input.route);
}) satisfies Handle<typeof listFlowLinksCanvas>;

export { handle };
