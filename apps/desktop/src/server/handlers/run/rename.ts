import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { renameRun } from "@design-studio/actions/run/rename";
import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type RenameRunInput = Input<typeof renameRun>;

const handle = Effect.fn("run.rename")(function* run(input: RenameRunInput) {
  const service = yield* RunLogWriter;

  return yield* service.rename(input.projectId, input.runId, input.title);
}) satisfies Handle<typeof renameRun>;

export { handle };
