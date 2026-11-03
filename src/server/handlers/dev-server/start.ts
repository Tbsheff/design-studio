import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { startDevServer } from "../../../shared/actions/dev-server/start.js";
import { DevServerRunner } from "../../app/index.js";
import type { Handle } from "../_core/handler.js";

type StartDevServerInput = Input<typeof startDevServer>;

const handle = Effect.fn("dev-server.start")(function* run(
  input: StartDevServerInput
) {
  const service = yield* DevServerRunner;

  return yield* service.control(input.projectId, "start");
}) satisfies Handle<typeof startDevServer>;

export { handle };
