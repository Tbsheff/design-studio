import type { Input } from "@design-studio/actions/_core/action";
import type { createScenario } from "@design-studio/actions/scenario/create";
import { Effect } from "effect";

import { ScenarioRunner } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type CreateScenarioInput = Input<typeof createScenario>;

const handle = Effect.fn("scenario.create")(function* run(
  input: CreateScenarioInput
) {
  const runner = yield* ScenarioRunner;

  return yield* runner.create({
    directionId: input.directionId,
    frameId: input.frameId,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof createScenario>;

export { handle };
