import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listRoutesMcpRead } from "../../../shared/actions/mcp-read/list-routes.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type ListRoutesMcpReadInput = Input<typeof listRoutesMcpRead>;

const handle = Effect.fn("mcp-read.listRoutes")(function* run(
  input: ListRoutesMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.routeList({
    cursor: input.cursor ?? null,
    limit: input.limit ?? null,
    projectId: input.projectId,
    query: input.query ?? null,
  });
}) satisfies Handle<typeof listRoutesMcpRead>;

export { handle };
