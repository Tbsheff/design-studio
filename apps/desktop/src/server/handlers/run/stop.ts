import type { Input } from "@design-studio/actions/_core/action";
import type { stopRun } from "@design-studio/actions/run/stop";
import { Effect } from "effect";

import { RunLogWriter, StateRunQueue } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type StopRunInput = Input<typeof stopRun>;

const STOPPED = { ok: true } as const;

const handle = Effect.fn("run.stop")(function* run(input: StopRunInput) {
  const service = yield* RunLogWriter;
  const queue = yield* StateRunQueue;
  const isSequence = yield* queue.stopOf(input.projectId, input.runId);

  return yield* service.stop(input.projectId, input.runId).pipe(
    Effect.catchTag("NotFound", (error) => {
      if (isSequence) {
        return Effect.succeed(STOPPED);
      }

      return Effect.fail(error);
    })
  );
}) satisfies Handle<typeof stopRun>;

export { handle };
