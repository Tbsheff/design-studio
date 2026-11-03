import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getDesignMdMcpRead } from "../../../shared/actions/mcp-read/get-design-md.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type GetDesignMdMcpReadInput = Input<typeof getDesignMdMcpRead>;

const handle = Effect.fn("mcp-read.getDesignMd")(function* run(
  input: GetDesignMdMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.designMd({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof getDesignMdMcpRead>;

export { handle };
