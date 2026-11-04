import type { Input } from "@design-studio/actions/_core/action";
import type { getAnimation } from "@design-studio/actions/animation/get";
import { Effect } from "effect";

import { AnimationStore } from "../../state-styles/index.js";
import type { Handle } from "../_core/handler.js";

type GetAnimationInput = Input<typeof getAnimation>;

const handle = Effect.fn("animation.get")(function* run(
  input: GetAnimationInput
) {
  const store = yield* AnimationStore;

  const animation = yield* store.get({
    animationId: input.animationId,
    directionId: input.directionId,
    projectId: input.projectId,
  });

  return { animation };
}) satisfies Handle<typeof getAnimation>;

export { handle };
