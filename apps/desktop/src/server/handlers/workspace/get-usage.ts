import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getUsageWorkspace } from "../../../shared/actions/workspace/get-usage.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetUsageWorkspaceInput = Input<typeof getUsageWorkspace>;

const handle = Effect.fn("workspace.getUsage")(function* run(
  input: GetUsageWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.usage({
    directionId: input.directionId ?? null,
    file: input.file.trim(),
    projectId: input.projectId,
    route: input.route?.trim() ?? null,
    usedAt: input.usedAt?.trim() ?? null,
  });
}) satisfies Handle<typeof getUsageWorkspace>;

export { handle };
