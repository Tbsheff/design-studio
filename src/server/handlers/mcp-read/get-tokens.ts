import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getTokensMcpRead } from "../../../shared/actions/mcp-read/get-tokens.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetTokensMcpReadInput = Input<typeof getTokensMcpRead>;

const handle = Effect.fn("mcp-read.getTokens")(function* run(
  input: GetTokensMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.tokens({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof getTokensMcpRead>;

export { handle };
