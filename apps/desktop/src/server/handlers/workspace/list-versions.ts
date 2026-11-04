import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { listVersionsWorkspace } from "@design-studio/actions/workspace/list-versions";
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
