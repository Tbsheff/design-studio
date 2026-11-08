import type { Input } from "@design-studio/actions/_core/action";
import type { runWalkthrough } from "@design-studio/actions/walkthrough/run";
import { Effect } from "effect";

import { WalkthroughRunner } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type RunWalkthroughInput = Input<typeof runWalkthrough>;

const handle = Effect.fn("walkthrough.run")(function* run(
  input: RunWalkthroughInput
) {
  const runner = yield* WalkthroughRunner;

  return yield* runner.run({
    canWrite: input.canWrite,
    directionId: input.directionId,
    frameId: input.frameId,
    maxSteps: input.maxSteps,
    persona: input.persona,
    projectId: input.projectId,
    task: input.task,
  });
}) satisfies Handle<typeof runWalkthrough>;

export { handle };
