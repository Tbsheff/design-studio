import type { Input } from "@design-studio/actions/_core/action";
import type { getStatesRun } from "@design-studio/actions/run/get-states";
import { Effect } from "effect";

import { StateRunStore } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type GetStatesRunInput = Input<typeof getStatesRun>;

const handle = Effect.fn("run.getStates")(function* run(
  input: GetStatesRunInput
) {
  const store = yield* StateRunStore;

  return yield* store.get(input.projectId, input.sequenceId);
}) satisfies Handle<typeof getStatesRun>;

export { handle };
