import type { Input } from "@design-studio/actions/_core/action";
import type { inspectPort } from "@design-studio/actions/port/inspect";
import { Effect } from "effect";

import { McpReadStore } from "../../preview/index.js";
import { RouteSourceStore } from "../../project-ops/index.js";
import {
  PortMatchStore,
  toPortRouteUpdate,
  toPortSourceCommand,
} from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type InspectPortInput = Input<typeof inspectPort>;

const handle = Effect.fn("port.inspect")(function* run(
  input: InspectPortInput
) {
  const reads = yield* McpReadStore;
  const store = yield* PortMatchStore;
  const routeSource = yield* RouteSourceStore;

  const changes = yield* routeSource
    .inspectChanges(toPortSourceCommand(input))
    .pipe(Effect.orElseSucceed(() => null));

  return yield* store.inspect(reads, {
    directionId: input.directionId,
    limit: input.limit,
    path: input.path,
    projectId: input.projectId,
    routePath: input.routePath,
    targetProjectId: input.targetProjectId,
    update: toPortRouteUpdate(changes, input),
    width: input.width,
  });
}) satisfies Handle<typeof inspectPort>;

export { handle };
