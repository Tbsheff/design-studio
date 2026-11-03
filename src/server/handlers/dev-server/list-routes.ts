import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listRoutesDevServer } from "../../../shared/actions/dev-server/list-routes.js";
import { DevServerStore } from "../../app/index.js";
import type { Handle } from "../_core/handler.js";

type ListRoutesDevServerInput = Input<typeof listRoutesDevServer>;

const handle = Effect.fn("dev-server.listRoutes")(function* run(
  input: ListRoutesDevServerInput
) {
  const service = yield* DevServerStore;

  return yield* service.routes(input.projectId);
}) satisfies Handle<typeof listRoutesDevServer>;

export { handle };
