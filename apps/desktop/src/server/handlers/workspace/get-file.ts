import type { Input } from "@design-studio/actions/_core/action";
import type { getFileWorkspace } from "@design-studio/actions/workspace/get-file";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetFileWorkspaceInput = Input<typeof getFileWorkspace>;

const handle = Effect.fn("workspace.getFile")(function* run(
  input: GetFileWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.fileText({
    directionId: input.directionId ?? null,
    path: input.path,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof getFileWorkspace>;

export { handle };
