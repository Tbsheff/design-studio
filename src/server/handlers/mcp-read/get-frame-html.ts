import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getFrameHtmlMcpRead } from "../../../shared/actions/mcp-read/get-frame-html.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetFrameHtmlMcpReadInput = Input<typeof getFrameHtmlMcpRead>;

const handle = Effect.fn("mcp-read.getFrameHtml")(function* run(
  input: GetFrameHtmlMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.frameHtml({
    directionId: input.directionId ?? null,
    path: input.path ?? null,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof getFrameHtmlMcpRead>;

export { handle };
