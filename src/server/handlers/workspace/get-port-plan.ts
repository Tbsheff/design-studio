import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getPortPlanWorkspace } from "../../../shared/actions/workspace/get-port-plan.js";
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
