import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { stopRun } from "../../../shared/actions/run/stop.js";
import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type StopRunInput = Input<typeof stopRun>;

const handle = Effect.fn("run.stop")(function* run(input: StopRunInput) {
  const service = yield* RunLogWriter;

  return yield* service.stop(input.runId);
}) satisfies Handle<typeof stopRun>;

export { handle };
