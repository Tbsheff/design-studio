import type { Input } from "@design-studio/actions/_core/action";
import type { applyLayerStyle } from "@design-studio/actions/layer-style/apply";
import { Effect } from "effect";

import { LayerStyleWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyLayerStyleInput = Input<typeof applyLayerStyle>;

const handle = Effect.fn("layer-style.apply")(function* run(
  input: ApplyLayerStyleInput
) {
  const writer = yield* LayerStyleWriter;

  return yield* writer.apply({
    directionId: input.directionId,
    groups: input.groups,
    projectId: input.projectId,
    sourceLayerId: input.sourceLayerId,
    targetLayerIds: input.targetLayerIds,
    variant: input.variant,
  });
}) satisfies Handle<typeof applyLayerStyle>;

export { handle };
