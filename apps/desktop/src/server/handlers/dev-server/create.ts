import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createDevServer } from "../../../shared/actions/dev-server/create.js";
import { DevServerRunner } from "../../app/index.js";
import type { Handle } from "../_core/handler.js";

type CreateDevServerInput = Input<typeof createDevServer>;

const handle = Effect.fn("dev-server.create")(function* run(
  input: CreateDevServerInput
) {
  const service = yield* DevServerRunner;

  return yield* service.attach(input);
}) satisfies Handle<typeof createDevServer>;

export { handle };
