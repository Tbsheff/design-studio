import type { Input } from "@design-studio/actions/_core/action";
import type { getAttentionCritique } from "@design-studio/actions/critique/get-attention";
import { Effect } from "effect";

import { AttentionStore } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type GetAttentionCritiqueInput = Input<typeof getAttentionCritique>;

const handle = Effect.fn("critique.getAttention")(function* run(
  input: GetAttentionCritiqueInput
) {
  const store = yield* AttentionStore;

  const result = yield* store.get({
    directionId: input.directionId,
    frameId: input.frameId,
    projectId: input.projectId,
  });

  return { result };
}) satisfies Handle<typeof getAttentionCritique>;

export { handle };
