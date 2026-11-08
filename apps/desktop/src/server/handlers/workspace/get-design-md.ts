import type { Input } from "@design-studio/actions/_core/action";
import type { getDesignMdWorkspace } from "@design-studio/actions/workspace/get-design-md";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetDesignMdWorkspaceInput = Input<typeof getDesignMdWorkspace>;

const handle = Effect.fn("workspace.getDesignMd")(function* run(
  input: GetDesignMdWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.designMd({
    directionId: input.directionId ?? null,
    projectId: input.projectId,
    versionId: input.versionId ?? null,
  });
}) satisfies Handle<typeof getDesignMdWorkspace>;

export { handle };
