import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { searchProjectsWorkspace } from "../../../shared/actions/workspace/search-projects.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type SearchProjectsWorkspaceInput = Input<typeof searchProjectsWorkspace>;

const DEFAULT_LIMIT = 20;

const handle = Effect.fn("workspace.searchProjects")(function* run(
  input: SearchProjectsWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.projectSearch({
    limit: input.limit ?? DEFAULT_LIMIT,
    projectId: input.projectId ?? null,
    query: input.query ?? "",
  });
}) satisfies Handle<typeof searchProjectsWorkspace>;

export { handle };
