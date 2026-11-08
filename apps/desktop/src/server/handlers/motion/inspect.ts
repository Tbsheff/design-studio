import type { Input } from "@design-studio/actions/_core/action";
import type { inspectMotion } from "@design-studio/actions/motion/inspect";
import { Effect } from "effect";

import { MotionStore } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type InspectMotionInput = Input<typeof inspectMotion>;

const handle = Effect.fn("motion.inspect")(function* run(
  input: InspectMotionInput
) {
  const store = yield* MotionStore;

  const info = yield* store.get({
    directionId: input.directionId,
    projectId: input.projectId,
    source: { col: input.col, file: input.file, line: input.line },
  });

  return {
    ...info,
    animations: info.animations.slice(0, input.limit),
    classes: info.classes.slice(0, input.limit),
    rules: info.rules.slice(0, input.limit),
    transitions: info.transitions.slice(0, input.limit),
  };
}) satisfies Handle<typeof inspectMotion>;

export { handle };
