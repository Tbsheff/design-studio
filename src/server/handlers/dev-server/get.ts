import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getDevServer } from "../../../shared/actions/dev-server/get.js";
import { DevServerStore } from "../../app/index.js";
import type { Handle } from "../_core/handler.js";

type GetDevServerInput = Input<typeof getDevServer>;

const handle = Effect.fn("dev-server.get")(function* run(
  input: GetDevServerInput
) {
  const service = yield* DevServerStore;

  return yield* service.view(input.projectId);
}) satisfies Handle<typeof getDevServer>;

export { handle };
