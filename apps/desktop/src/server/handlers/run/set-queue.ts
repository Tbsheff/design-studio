import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { setQueueRun } from "@design-studio/actions/run/set-queue";
import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type SetQueueRunInput = Input<typeof setQueueRun>;

const handle = Effect.fn("run.setQueue")(function* run(
  input: SetQueueRunInput
) {
  const service = yield* RunLogWriter;

  return yield* service.setQueue(input.projectId, input.runId, input.items);
}) satisfies Handle<typeof setQueueRun>;

export { handle };
