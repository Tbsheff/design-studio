import type { Input } from "@design-studio/actions/_core/action";
import type { listAnimation } from "@design-studio/actions/animation/list";
import { Effect } from "effect";

import { AnimationStore } from "../../state-styles/index.js";
import type { Handle } from "../_core/handler.js";

type ListAnimationInput = Input<typeof listAnimation>;

const handle = Effect.fn("animation.list")(function* run(
  input: ListAnimationInput
) {
  const store = yield* AnimationStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listAnimation>;

export { handle };
