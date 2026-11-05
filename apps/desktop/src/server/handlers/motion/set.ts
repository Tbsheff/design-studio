import type { Input } from "@design-studio/actions/_core/action";
import type { setMotion } from "@design-studio/actions/motion/set";
import { Effect } from "effect";

import { MotionWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type SetMotionInput = Input<typeof setMotion>;

const handle = Effect.fn("motion.set")(function* run(input: SetMotionInput) {
  const writer = yield* MotionWriter;
  const { target } = input;

  return yield* writer.set({
    directionId: input.directionId,
    projectId: input.projectId,
    selector: target.selector ?? null,
    source: target.source,
    spec: input.spec,
    tag: target.tag ?? null,
  });
}) satisfies Handle<typeof setMotion>;

export { handle };
