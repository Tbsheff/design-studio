import type { Input } from "@design-studio/actions/_core/action";
import type { listRoutesDevServer } from "@design-studio/actions/dev-server/list-routes";
import { Effect } from "effect";

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
