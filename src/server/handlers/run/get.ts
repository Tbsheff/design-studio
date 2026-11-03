import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getRun } from "../../../shared/actions/run/get.js";
import { RunLogStore } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type GetRunInput = Input<typeof getRun>;

const handle = Effect.fn("run.get")(function* run(input: GetRunInput) {
  const service = yield* RunLogStore;

  return yield* service.get(input.projectId, input.runId);
}) satisfies Handle<typeof getRun>;

export { handle };
