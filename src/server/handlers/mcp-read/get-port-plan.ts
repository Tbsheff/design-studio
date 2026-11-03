import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getPortPlanMcpRead } from "../../../shared/actions/mcp-read/get-port-plan.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type GetPortPlanMcpReadInput = Input<typeof getPortPlanMcpRead>;

const handle = Effect.fn("mcp-read.getPortPlan")(function* run(
  input: GetPortPlanMcpReadInput
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
}) satisfies Handle<typeof getPortPlanMcpRead>;

export { handle };
