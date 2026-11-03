import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getContextRun } from "../../../shared/actions/run/get-context.js";
import { RunLogStore } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type GetContextRunInput = Input<typeof getContextRun>;

const handle = Effect.fn("run.getContext")(function* run(
  input: GetContextRunInput
) {
  const service = yield* RunLogStore;

  return yield* service.context(input.projectId, input.directionId);
}) satisfies Handle<typeof getContextRun>;

export { handle };
