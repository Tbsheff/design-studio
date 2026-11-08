import type { Input } from "@design-studio/actions/_core/action";
import type { runVisionAccessibility } from "@design-studio/actions/accessibility/run-vision";
import { Effect } from "effect";

import { VisionRunner } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type RunVisionAccessibilityInput = Input<typeof runVisionAccessibility>;

const handle = Effect.fn("accessibility.runVision")(function* run(
  input: RunVisionAccessibilityInput
) {
  const runner = yield* VisionRunner;

  return yield* runner.run({
    directionId: input.directionId,
    frameId: input.frameId,
    kinds: input.kinds,
    layer: input.layer,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof runVisionAccessibility>;

export { handle };
