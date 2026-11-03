import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { searchProject } from "../../../shared/actions/project/search.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type SearchProjectsInput = Input<typeof searchProject>;

const DEFAULT_LIMIT = 20;

const handle = Effect.fn("project.search")(function* run(
  input: SearchProjectsInput
) {
  const store = yield* McpReadStore;

  return yield* store.projectSearch({
    limit: input.limit ?? DEFAULT_LIMIT,
    projectId: input.project ?? null,
    query: input.query ?? "",
  });
}) satisfies Handle<typeof searchProject>;

export { handle };
