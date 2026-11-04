import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getRun } from "@design-studio/actions/run/get";
import { RunLogStore } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type GetRunInput = Input<typeof getRun>;

const handle = Effect.fn("run.get")(function* run(input: GetRunInput) {
  const service = yield* RunLogStore;

  return yield* service.get(input.projectId, input.runId);
}) satisfies Handle<typeof getRun>;

export { handle };
