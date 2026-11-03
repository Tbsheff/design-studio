import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getRunContextMcpRead } from "../../../shared/actions/mcp-read/get-run-context.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type GetRunContextMcpReadInput = Input<typeof getRunContextMcpRead>;

const handle = Effect.fn("mcp-read.getRunContext")(function* run(
  input: GetRunContextMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.runContext({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof getRunContextMcpRead>;

export { handle };
