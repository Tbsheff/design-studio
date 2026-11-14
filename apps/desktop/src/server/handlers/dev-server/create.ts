import type { Input } from "@design-studio/actions/_core/action";
import type { createDevServer } from "@design-studio/actions/dev-server/create";
import { Effect } from "effect";

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
