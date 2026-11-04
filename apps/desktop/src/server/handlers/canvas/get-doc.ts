import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getDocCanvas } from "@design-studio/actions/canvas/get-doc";
import { CanvasStore } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type GetDocCanvasInput = Input<typeof getDocCanvas>;

const handle = Effect.fn("canvas.getDoc")(function* run(
  input: GetDocCanvasInput
) {
  const service = yield* CanvasStore;

  return yield* service.getDoc(input.projectId);
}) satisfies Handle<typeof getDocCanvas>;

export { handle };
