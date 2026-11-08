import type { Input } from "@design-studio/actions/_core/action";
import type { listFilesWorkspace } from "@design-studio/actions/workspace/list-files";
import { Effect } from "effect";

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
