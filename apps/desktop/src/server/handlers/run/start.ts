import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { startRun } from "@design-studio/actions/run/start";
import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type StartRunInput = Input<typeof startRun>;

const handle = Effect.fn("run.start")(function* run(input: StartRunInput) {
  const service = yield* RunLogWriter;

  const { directionId, projectId, ...body } = input;

  return yield* service.start({ body, directionId, projectId });
}) satisfies Handle<typeof startRun>;

export { handle };
