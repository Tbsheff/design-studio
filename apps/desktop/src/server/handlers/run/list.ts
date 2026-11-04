import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { listRun } from "@design-studio/actions/run/list";
import { RunLogStore } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type ListRunInput = Input<typeof listRun>;

const handle = Effect.fn("run.list")(function* run(input: ListRunInput) {
  const service = yield* RunLogStore;

  const { projectId, ...rest } = input;

  return yield* service.list(projectId, rest);
}) satisfies Handle<typeof listRun>;

export { handle };
