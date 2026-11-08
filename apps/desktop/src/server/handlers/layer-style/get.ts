import type { Input } from "@design-studio/actions/_core/action";
import type { getLayerStyle } from "@design-studio/actions/layer-style/get";
import { Effect } from "effect";

import { LayerStyleStore } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type GetLayerStyleInput = Input<typeof getLayerStyle>;

const handle = Effect.fn("layer-style.get")(function* run(
  input: GetLayerStyleInput
) {
  const store = yield* LayerStyleStore;

  return yield* store.get({
    directionId: input.directionId,
    groups: input.groups,
    layerId: input.layerId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof getLayerStyle>;

export { handle };
