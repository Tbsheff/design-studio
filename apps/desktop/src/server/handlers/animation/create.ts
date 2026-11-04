import type { Input } from "@design-studio/actions/_core/action";
import type { createAnimation } from "@design-studio/actions/animation/create";
import { Effect } from "effect";

import { AnimationWriter } from "../../state-styles/index.js";
import type { Handle } from "../_core/handler.js";

type CreateAnimationInput = Input<typeof createAnimation>;

const handle = Effect.fn("animation.create")(function* run(
  input: CreateAnimationInput
) {
  const writer = yield* AnimationWriter;

  return yield* writer.create({
    directionId: input.directionId,
    durationMs: input.durationMs,
    file: input.file,
    loop: input.loop,
    name: input.name,
    projectId: input.projectId,
    tracks: input.tracks,
    trigger: input.trigger,
  });
}) satisfies Handle<typeof createAnimation>;

export { handle };
