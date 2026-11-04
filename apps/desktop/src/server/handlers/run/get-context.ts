import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getContextRun } from "@design-studio/actions/run/get-context";
import { RunLogStore } from "../../run-log/index.js";
import type { Handle } from "../_core/handler.js";

type GetContextRunInput = Input<typeof getContextRun>;

const handle = Effect.fn("run.getContext")(function* run(
  input: GetContextRunInput
) {
  const service = yield* RunLogStore;

  const context = yield* service.context(input.projectId, input.directionId);

  return { ...context, files: context.files.slice(0, input.limit) };
}) satisfies Handle<typeof getContextRun>;

export { handle };
