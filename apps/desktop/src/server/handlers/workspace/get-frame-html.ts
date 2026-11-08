import type { Input } from "@design-studio/actions/_core/action";
import type { getFrameHtmlWorkspace } from "@design-studio/actions/workspace/get-frame-html";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetFrameHtmlWorkspaceInput = Input<typeof getFrameHtmlWorkspace>;

const handle = Effect.fn("workspace.getFrameHtml")(function* run(
  input: GetFrameHtmlWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.frameHtml({
    directionId: input.directionId ?? null,
    path: input.path ?? null,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof getFrameHtmlWorkspace>;

export { handle };
