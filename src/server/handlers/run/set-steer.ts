import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setSteerRun } from "../../../shared/actions/run/set-steer.js";
import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type SetSteerRunInput = Input<typeof setSteerRun>;

const handle = Effect.fn("run.setSteer")(function* run(
  input: SetSteerRunInput
) {
  const service = yield* RunLogWriter;

  return yield* service.steer(input.runId, input.text);
}) satisfies Handle<typeof setSteerRun>;

export { handle };
