import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { stopDevServer } from "../../../shared/actions/dev-server/stop.js";
import { DevServerRunner } from "../../app/index.js";
import type { Handle } from "../_core/handler.js";

type StopDevServerInput = Input<typeof stopDevServer>;

const handle = Effect.fn("dev-server.stop")(function* run(
  input: StopDevServerInput
) {
  const service = yield* DevServerRunner;

  return yield* service.control(input.projectId, "stop");
}) satisfies Handle<typeof stopDevServer>;

export { handle };
