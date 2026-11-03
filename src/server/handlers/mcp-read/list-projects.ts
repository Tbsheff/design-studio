import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listProjectsMcpRead } from "../../../shared/actions/mcp-read/list-projects.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type ListProjectsMcpReadInput = Input<typeof listProjectsMcpRead>;

const handle = Effect.fn("mcp-read.listProjects")(function* run(
  _input: ListProjectsMcpReadInput
) {
  const store = yield* McpReadStore;
  const items = yield* store.projectList();

  return { items };
}) satisfies Handle<typeof listProjectsMcpRead>;

export { handle };
