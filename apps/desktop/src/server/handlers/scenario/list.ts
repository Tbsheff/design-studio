import type { Input } from "@design-studio/actions/_core/action";
import type { listScenario } from "@design-studio/actions/scenario/list";
import { Effect } from "effect";

import { ScenarioStore } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type ListScenarioInput = Input<typeof listScenario>;

const handle = Effect.fn("scenario.list")(function* run(
  input: ListScenarioInput
) {
  const store = yield* ScenarioStore;

  return yield* store.list({
    cursor: input.cursor,
    directionId: input.directionId,
    frameId: input.frameId,
    limit: input.limit,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof listScenario>;

export { handle };
