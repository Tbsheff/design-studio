import type { Input } from "@design-studio/actions/_core/action";
import type { setLayerStyle } from "@design-studio/actions/layer-style/set";
import { Effect } from "effect";

import { LayerLayoutWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type SetLayerStyleInput = Input<typeof setLayerStyle>;

const handle = Effect.fn("layer-style.set")(function* run(
  input: SetLayerStyleInput
) {
  const writer = yield* LayerLayoutWriter;

  return yield* writer.set({
    directionId: input.directionId,
    gap: input.gap,
    layerId: input.layerId,
    layout: input.layout,
    padding: input.padding,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof setLayerStyle>;

export { handle };
