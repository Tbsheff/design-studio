import type { Input } from "@design-studio/actions/_core/action";
import type { setPermissionRun } from "@design-studio/actions/run/set-permission";
import { Effect } from "effect";

import { RunLogWriter } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type SetPermissionRunInput = Input<typeof setPermissionRun>;

const handle = Effect.fn("run.setPermission")(function* run(
  input: SetPermissionRunInput
) {
  const service = yield* RunLogWriter;

  const { projectId, requestId, runId, ...answer } = input;

  return yield* service.answer(projectId, runId, requestId, answer);
}) satisfies Handle<typeof setPermissionRun>;

export { handle };
