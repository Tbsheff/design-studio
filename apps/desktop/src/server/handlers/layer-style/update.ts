import type { Input } from "@design-studio/actions/_core/action";
import type { updateLayerStyle } from "@design-studio/actions/layer-style/update";
import { Effect } from "effect";

import { LayerScaleWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateLayerStyleInput = Input<typeof updateLayerStyle>;

const handle = Effect.fn("layer-style.update")(function* run(
  input: UpdateLayerStyleInput
) {
  const writer = yield* LayerScaleWriter;

  return yield* writer.update({
    directionId: input.directionId,
    factor: input.factor,
    layerId: input.layerId,
    projectId: input.projectId,
    shouldKeepTokens: input.shouldKeepTokens,
  });
}) satisfies Handle<typeof updateLayerStyle>;

export { handle };
