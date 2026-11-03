import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getFileMcpRead } from "../../../shared/actions/mcp-read/get-file.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetFileMcpReadInput = Input<typeof getFileMcpRead>;

const handle = Effect.fn("mcp-read.getFile")(function* run(
  input: GetFileMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.fileText({
    directionId: input.directionId ?? null,
    path: input.path,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof getFileMcpRead>;

export { handle };
