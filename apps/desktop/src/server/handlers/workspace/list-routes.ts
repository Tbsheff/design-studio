import type { Input } from "@design-studio/actions/_core/action";
import type { listRoutesWorkspace } from "@design-studio/actions/workspace/list-routes";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type ListRoutesWorkspaceInput = Input<typeof listRoutesWorkspace>;

const handle = Effect.fn("workspace.listRoutes")(function* run(
  input: ListRoutesWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.routeList({
    cursor: input.cursor ?? null,
    limit: input.limit ?? null,
    projectId: input.projectId,
    query: input.query ?? null,
  });
}) satisfies Handle<typeof listRoutesWorkspace>;

export { handle };
