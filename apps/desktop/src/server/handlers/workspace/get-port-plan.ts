import type { Input } from "@design-studio/actions/_core/action";
import type { getPortPlanWorkspace } from "@design-studio/actions/workspace/get-port-plan";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetPortPlanWorkspaceInput = Input<typeof getPortPlanWorkspace>;

const handle = Effect.fn("workspace.getPortPlan")(function* run(
  input: GetPortPlanWorkspaceInput
) {
  const store = yield* McpReadStore;

  return yield* store.portPlan({
    flow: input.flow === true,
    path: input.path ?? null,
    paths: input.paths ?? null,
    route: input.route ?? null,
    sourceDirectionId: input.directionId ?? null,
    sourceProjectId: input.projectId,
    targetProjectId: input.targetProjectId ?? null,
  });
}) satisfies Handle<typeof getPortPlanWorkspace>;

export { handle };
