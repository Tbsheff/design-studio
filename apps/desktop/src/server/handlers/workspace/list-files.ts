import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listFilesWorkspace } from "../../../shared/actions/workspace/list-files.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type ListFilesWorkspaceInput = Input<typeof listFilesWorkspace>;

const handle = Effect.fn("workspace.listFiles")(function* run(
  input: ListFilesWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.fileList({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof listFilesWorkspace>;

export { handle };
