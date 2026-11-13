import type { Input } from "@design-studio/actions/_core/action";
import type { inspectPort } from "@design-studio/actions/port/inspect";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import { PortMatchStore } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type InspectPortInput = Input<typeof inspectPort>;

const handle = Effect.fn("port.inspect")(function* run(
  input: InspectPortInput
) {
  const reads = yield* McpReadStore;
  const store = yield* PortMatchStore;

  return yield* store.inspect(reads, {
    directionId: input.directionId,
    limit: input.limit,
    path: input.path,
    projectId: input.projectId,
    routePath: input.routePath,
    targetProjectId: input.targetProjectId,
    width: input.width,
  });
}) satisfies Handle<typeof inspectPort>;

export { handle };
