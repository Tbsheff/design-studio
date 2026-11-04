import type { Input } from "@design-studio/actions/_core/action";
import type { applyScenario } from "@design-studio/actions/scenario/apply";
import { Effect } from "effect";

import { ScenarioRunner } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyScenarioInput = Input<typeof applyScenario>;

const handle = Effect.fn("scenario.apply")(function* run(
  input: ApplyScenarioInput
) {
  const runner = yield* ScenarioRunner;

  return yield* runner.apply({
    directionId: input.directionId,
    frameId: input.frameId,
    projectId: input.projectId,
    scenarioId: input.scenarioId,
  });
}) satisfies Handle<typeof applyScenario>;

export { handle };
