import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listRun } from "../../../shared/actions/run/list.js";
import { RunLogStore } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type ListRunInput = Input<typeof listRun>;

const handle = Effect.fn("run.list")(function* run(input: ListRunInput) {
  const service = yield* RunLogStore;

  const { projectId, ...rest } = input;

  return yield* service.list(projectId, rest);
}) satisfies Handle<typeof listRun>;

export { handle };
