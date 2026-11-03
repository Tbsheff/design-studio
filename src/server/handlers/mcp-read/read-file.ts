import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { readFileMcpRead } from "../../../shared/actions/mcp-read/read-file.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type ReadFileMcpReadInput = Input<typeof readFileMcpRead>;

const handle = Effect.fn("mcp-read.readFile")(function* run(
  input: ReadFileMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.fileText({
    directionId: input.directionId ?? null,
    path: input.path,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof readFileMcpRead>;

export { handle };
