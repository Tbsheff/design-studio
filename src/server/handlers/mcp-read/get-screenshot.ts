import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getScreenshotMcpRead } from "../../../shared/actions/mcp-read/get-screenshot.js";
import { McpReadStore } from "../../preview/mcp-read-store.js";
import type { Handle } from "../_core/handler.js";

type GetScreenshotMcpReadInput = Input<typeof getScreenshotMcpRead>;

const handle = Effect.fn("mcp-read.getScreenshot")(function* run(
  input: GetScreenshotMcpReadInput
) {
  const store = yield* McpReadStore;

  return yield* store.screenshot({
    directionId: input.directionId ?? null,
    element: input.element ?? null,
    frameId: input.frameId ?? null,
    height: input.height ?? null,
    isFullPage: input.fullPage === true,
    padding: input.padding ?? null,
    path: input.path ?? null,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
    width: input.width ?? null,
  });
}) satisfies Handle<typeof getScreenshotMcpRead>;

export { handle };
