import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { startDevserver } from "../../../shared/actions/devserver/start.js";
import { DevServerRunner } from "../../app/dev-server-runner.js";
import type { Handle } from "../_core/handler.js";

type StartDevserverInput = Input<typeof startDevserver>;

const handle = Effect.fn("devserver.start")(function* run(
  input: StartDevserverInput
) {
  const service = yield* DevServerRunner;

  return yield* service.control(input.projectId, "start");
}) satisfies Handle<typeof startDevserver>;

export { handle };
