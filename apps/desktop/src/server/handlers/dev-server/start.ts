import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { startDevServer } from "@design-studio/actions/dev-server/start";
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
