import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listFilesMcpRead } from "../../../shared/actions/mcp-read/list-files.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type ListFilesMcpReadInput = Input<typeof listFilesMcpRead>;

const handle = Effect.fn("mcp-read.listFiles")(function* run(
  input: ListFilesMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.fileList({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof listFilesMcpRead>;

export { handle };
