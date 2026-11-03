import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { searchProject } from "../../../shared/actions/project/search.js";
import { McpReadStore } from "../../preview/index.js";
import { LocalOrgScope } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type SearchProjectInput = Input<typeof searchProject>;

const handle = Effect.fn("project.search")(function* run(
  input: SearchProjectInput
) {
  const store = yield* McpReadStore;
  const scope = yield* LocalOrgScope;

  const found = yield* store.projectSearch({
    limit: input.limit,
    projectId: input.projectId,
    query: input.query,
    scope,
  });

  const items = [
    ...found.projects.map((hit) =>
      Object.assign(hit, { kind: "project" as const })
    ),
    ...found.routes.map((hit) =>
      Object.assign(hit, { kind: "route" as const })
    ),
  ];

  return { items, next: null };
}) satisfies Handle<typeof searchProject>;

export { handle };
