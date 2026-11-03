import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createDevserver } from "../../../shared/actions/devserver/create.js";
import { DevServerRunner } from "../../app/dev-server-runner.js";
import type { Handle } from "../_core/handler.js";

type CreateDevserverInput = Input<typeof createDevserver>;

const handle = Effect.fn("devserver.create")(function* run(
  input: CreateDevserverInput
) {
  const service = yield* DevServerRunner;

  return yield* service.attach(input);
}) satisfies Handle<typeof createDevserver>;

export { handle };
