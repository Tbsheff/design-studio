import type { Input } from "@design-studio/actions/_core/action";
import type { getScreenshotWorkspace } from "@design-studio/actions/workspace/get-screenshot";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetScreenshotWorkspaceInput = Input<typeof getScreenshotWorkspace>;

const handle = Effect.fn("workspace.getScreenshot")(function* run(
  input: GetScreenshotWorkspaceInput
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
}) satisfies Handle<typeof getScreenshotWorkspace>;

export { handle };
