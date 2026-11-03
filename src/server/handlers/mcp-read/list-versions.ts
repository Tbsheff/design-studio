import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listVersionsMcpRead } from "../../../shared/actions/mcp-read/list-versions.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type ListVersionsMcpReadInput = Input<typeof listVersionsMcpRead>;

const handle = Effect.fn("mcp-read.listVersions")(function* run(
  input: ListVersionsMcpReadInput
) {
  const store = yield* McpReadStore;

  const items = yield* store.versionList({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
  });

  return { items };
}) satisfies Handle<typeof listVersionsMcpRead>;

export { handle };
