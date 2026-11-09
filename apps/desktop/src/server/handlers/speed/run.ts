import type { Input } from "@design-studio/actions/_core/action";
import type { runSpeed } from "@design-studio/actions/speed/run";
import { Effect } from "effect";

import { SpeedRunner } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type RunSpeedInput = Input<typeof runSpeed>;

const handle = Effect.fn("speed.run")(function* run(input: RunSpeedInput) {
  const runner = yield* SpeedRunner;

  return yield* runner.run({
    directionId: input.directionId,
    frameId: input.frameId,
    phase: input.phase,
    projectId: input.projectId,
    runs: input.runs,
  });
}) satisfies Handle<typeof runSpeed>;

export { handle };
