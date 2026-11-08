import type { Input } from "@design-studio/actions/_core/action";
import type { getTokensWorkspace } from "@design-studio/actions/workspace/get-tokens";
import { Effect } from "effect";

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
