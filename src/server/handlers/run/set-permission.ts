import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setPermissionRun } from "../../../shared/actions/run/set-permission.js";
import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type SetPermissionRunInput = Input<typeof setPermissionRun>;

const handle = Effect.fn("run.setPermission")(function* run(
  input: SetPermissionRunInput
) {
  const service = yield* RunLogWriter;

  const { requestId, runId, ...answer } = input;

  return yield* service.answer(runId, requestId, answer);
}) satisfies Handle<typeof setPermissionRun>;

export { handle };
