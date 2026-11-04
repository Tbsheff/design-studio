import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { stopRun } from "@design-studio/actions/run/stop";
import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type StopRunInput = Input<typeof stopRun>;

const handle = Effect.fn("run.stop")(function* run(input: StopRunInput) {
  const service = yield* RunLogWriter;

  return yield* service.stop(input.projectId, input.runId);
}) satisfies Handle<typeof stopRun>;

export { handle };
