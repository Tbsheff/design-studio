import type { Input } from "@design-studio/actions/_core/action";
import type { exportAnimation } from "@design-studio/actions/animation/export";
import { Effect } from "effect";

import { AnimationWriter } from "../../state-styles/index.js";
import type { Handle } from "../_core/handler.js";

type ExportAnimationInput = Input<typeof exportAnimation>;

const handle = Effect.fn("animation.export")(function* run(
  input: ExportAnimationInput
) {
  const writer = yield* AnimationWriter;

  return yield* writer.export({
    animationId: input.animationId,
    directionId: input.directionId,
    format: input.format,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof exportAnimation>;

export { handle };
