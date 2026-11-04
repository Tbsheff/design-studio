import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listVersionsWorkspace } from "../../../shared/actions/workspace/list-versions.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type ListVersionsWorkspaceInput = Input<typeof listVersionsWorkspace>;

const handle = Effect.fn("workspace.listVersions")(function* run(
  input: ListVersionsWorkspaceInput
) {
  const store = yield* McpReadStore;

  const items = yield* store.versionList({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
  });

  return { items };
}) satisfies Handle<typeof listVersionsWorkspace>;

export { handle };
