import type { Input } from "@design-studio/actions/_core/action";
import type { listEffect } from "@design-studio/actions/effect/list";
import { Effect } from "effect";

import { EffectStore } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ListEffectInput = Input<typeof listEffect>;

const handle = Effect.fn("effect.list")(function* run(input: ListEffectInput) {
  const store = yield* EffectStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listEffect>;

export { handle };
