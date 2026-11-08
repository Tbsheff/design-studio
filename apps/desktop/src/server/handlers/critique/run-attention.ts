import type { Input } from "@design-studio/actions/_core/action";
import type { runAttentionCritique } from "@design-studio/actions/critique/run-attention";
import { Effect } from "effect";

import { AttentionRunner } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type RunAttentionCritiqueInput = Input<typeof runAttentionCritique>;

const handle = Effect.fn("critique.runAttention")(function* run(
  input: RunAttentionCritiqueInput
) {
  const runner = yield* AttentionRunner;

  return yield* runner.run({
    directionId: input.directionId,
    frameId: input.frameId,
    layerId: input.layerId,
    projectId: input.projectId,
    width: input.width,
  });
}) satisfies Handle<typeof runAttentionCritique>;

export { handle };
