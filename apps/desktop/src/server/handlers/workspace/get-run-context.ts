import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getRunContextWorkspace } from "../../../shared/actions/workspace/get-run-context.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetRunContextWorkspaceInput = Input<typeof getRunContextWorkspace>;

const handle = Effect.fn("workspace.getRunContext")(function* run(
  input: GetRunContextWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.runContext({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof getRunContextWorkspace>;

export { handle };
