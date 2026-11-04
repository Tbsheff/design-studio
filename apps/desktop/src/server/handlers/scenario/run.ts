import type { Input } from "@design-studio/actions/_core/action";
import type { runScenario } from "@design-studio/actions/scenario/run";
import { Effect } from "effect";

import { ScenarioRunner } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type RunScenarioInput = Input<typeof runScenario>;

const handle = Effect.fn("scenario.run")(function* run(
  input: RunScenarioInput
) {
  const runner = yield* ScenarioRunner;

  return yield* runner.run({
    directionId: input.directionId,
    frameId: input.frameId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof runScenario>;

export { handle };
