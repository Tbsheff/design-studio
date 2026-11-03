import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { runDevserver } from "../../../shared/actions/devserver/run.js";
import { DevServerRunner } from "../../app/dev-server-runner.js";
import type { Handle } from "../_core/handler.js";

type RunDevserverInput = Input<typeof runDevserver>;

const handle = Effect.fn("devserver.run")(function* run(
  input: RunDevserverInput
) {
  const service = yield* DevServerRunner;

  return yield* service.control(input.projectId, "restart");
}) satisfies Handle<typeof runDevserver>;

export { handle };
