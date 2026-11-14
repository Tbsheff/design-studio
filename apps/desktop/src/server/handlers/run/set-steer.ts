import type { Input } from "@design-studio/actions/_core/action";
import type { setSteerRun } from "@design-studio/actions/run/set-steer";
import { Effect } from "effect";

import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type SetSteerRunInput = Input<typeof setSteerRun>;

const handle = Effect.fn("run.setSteer")(function* run(
  input: SetSteerRunInput
) {
  const service = yield* RunLogWriter;

  return yield* service.steer(input.projectId, input.runId, input.text);
}) satisfies Handle<typeof setSteerRun>;

export { handle };
