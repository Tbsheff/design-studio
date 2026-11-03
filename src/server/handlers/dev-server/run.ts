import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { runDevServer } from "../../../shared/actions/dev-server/run.js";
import { DevServerRunner } from "../../app/index.js";
import type { Handle } from "../_core/handler.js";

type RunDevServerInput = Input<typeof runDevServer>;

const handle = Effect.fn("dev-server.run")(function* run(
  input: RunDevServerInput
) {
  const service = yield* DevServerRunner;

  return yield* service.control(input.projectId, "restart");
}) satisfies Handle<typeof runDevServer>;

export { handle };
