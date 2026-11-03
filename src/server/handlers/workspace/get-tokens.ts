import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getTokensWorkspace } from "../../../shared/actions/workspace/get-tokens.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetTokensWorkspaceInput = Input<typeof getTokensWorkspace>;

const handle = Effect.fn("workspace.getTokens")(function* run(
  input: GetTokensWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.tokens({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof getTokensWorkspace>;

export { handle };
