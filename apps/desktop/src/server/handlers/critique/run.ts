import type { Input } from "@design-studio/actions/_core/action";
import type { runCritique } from "@design-studio/actions/critique/run";
import { Effect } from "effect";

import { CritiqueRunner } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type RunCritiqueInput = Input<typeof runCritique>;

const handle = Effect.fn("critique.run")(function* run(
  input: RunCritiqueInput
) {
  const runner = yield* CritiqueRunner;

  return yield* runner.run({
    directionId: input.directionId,
    frameId: input.frameId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof runCritique>;

export { handle };
