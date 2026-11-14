import type { Input } from "@design-studio/actions/_core/action";
import type { setDevServer } from "@design-studio/actions/dev-server/set";
import { Effect } from "effect";

import { DevServerRunner } from "../../app/index.js";
import type { Handle } from "../_core/handler.js";

type SetDevServerInput = Input<typeof setDevServer>;

const handle = Effect.fn("dev-server.set")(function* run(
  input: SetDevServerInput
) {
  const service = yield* DevServerRunner;

  return yield* service.setConfig(input);
}) satisfies Handle<typeof setDevServer>;

export { handle };
