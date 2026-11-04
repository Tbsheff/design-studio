import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getRunContextWorkspace } from "@design-studio/actions/workspace/get-run-context";
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
