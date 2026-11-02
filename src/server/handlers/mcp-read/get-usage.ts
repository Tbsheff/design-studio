import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getUsageMcpRead } from "../../../shared/actions/mcp-read/get-usage.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type GetUsageMcpReadInput = Input<typeof getUsageMcpRead>;

const handle = Effect.fn("mcp-read.getUsage")(function* run(
  input: GetUsageMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.usage({
    directionId: input.directionId ?? null,
    file: input.file.trim(),
    projectId: input.projectId,
    route: input.route?.trim() ?? null,
    usedAt: input.usedAt?.trim() ?? null,
  });
}) satisfies Handle<typeof getUsageMcpRead>;

export { handle };
