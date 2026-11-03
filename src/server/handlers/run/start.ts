import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { startRun } from "../../../shared/actions/run/start.js";
import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type StartRunInput = Input<typeof startRun>;

const handle = Effect.fn("run.start")(function* run(input: StartRunInput) {
  const service = yield* RunLogWriter;

  const { directionId, projectId, ...body } = input;

  return yield* service.start({ body, directionId, projectId });
}) satisfies Handle<typeof startRun>;

export { handle };
