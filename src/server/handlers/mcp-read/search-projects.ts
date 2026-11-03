import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { searchProjectsMcpRead } from "../../../shared/actions/mcp-read/search-projects.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type SearchProjectsMcpReadInput = Input<typeof searchProjectsMcpRead>;

const DEFAULT_LIMIT = 20;

const handle = Effect.fn("mcp-read.searchProjects")(function* run(
  input: SearchProjectsMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.projectSearch({
    limit: input.limit ?? DEFAULT_LIMIT,
    projectId: input.projectId ?? null,
    query: input.query ?? "",
  });
}) satisfies Handle<typeof searchProjectsMcpRead>;

export { handle };
