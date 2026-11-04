import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getDevServer } from "@design-studio/actions/dev-server/get";
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
