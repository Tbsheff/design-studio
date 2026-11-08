import type { Input } from "@design-studio/actions/_core/action";
import type { getFlowVideoCanvas } from "@design-studio/actions/canvas/get-flow-video";
import { Effect } from "effect";

import { FlowVideoStore } from "../../export/index.js";
import type { Handle } from "../_core/handler.js";

type GetFlowVideoCanvasInput = Input<typeof getFlowVideoCanvas>;

const handle = Effect.fn("canvas.getFlowVideo")(function* run(
  input: GetFlowVideoCanvasInput
) {
  const store = yield* FlowVideoStore;

  return yield* store.read(input);
}) satisfies Handle<typeof getFlowVideoCanvas>;

export { handle };
