import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { stopDevserver } from "../../../shared/actions/devserver/stop.js";
import { DevServerRunner } from "../../app/dev-server-runner.js";
import type { Handle } from "../_core/handler.js";

type StopDevserverInput = Input<typeof stopDevserver>;

const handle = Effect.fn("devserver.stop")(function* run(
  input: StopDevserverInput
) {
  const service = yield* DevServerRunner;

  return yield* service.control(input.projectId, "stop");
}) satisfies Handle<typeof stopDevserver>;

export { handle };
