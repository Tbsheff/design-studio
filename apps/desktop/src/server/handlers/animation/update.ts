import type { Input } from "@design-studio/actions/_core/action";
import type { updateAnimation } from "@design-studio/actions/animation/update";
import { Effect } from "effect";

import { AnimationWriter } from "../../state-styles/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateAnimationInput = Input<typeof updateAnimation>;

const handle = Effect.fn("animation.update")(function* run(
  input: UpdateAnimationInput
) {
  const writer = yield* AnimationWriter;

  return yield* writer.update({
    animationId: input.animationId,
    directionId: input.directionId,
    durationMs: input.durationMs ?? null,
    loop: input.loop ?? null,
    name: input.name ?? null,
    projectId: input.projectId,
    tracks: input.tracks ?? null,
    trigger: input.trigger ?? null,
  });
}) satisfies Handle<typeof updateAnimation>;

export { handle };
