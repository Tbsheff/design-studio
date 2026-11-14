import type { Input } from "@design-studio/actions/_core/action";
import type { runDevServer } from "@design-studio/actions/dev-server/run";
import { Effect } from "effect";

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
