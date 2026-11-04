import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { renameRun } from "../../../shared/actions/run/rename.js";
import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type RenameRunInput = Input<typeof renameRun>;

const handle = Effect.fn("run.rename")(function* run(input: RenameRunInput) {
  const service = yield* RunLogWriter;

  return yield* service.rename(input.projectId, input.runId, input.title);
}) satisfies Handle<typeof renameRun>;

export { handle };
