import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setDevServer } from "../../../shared/actions/dev-server/set.js";
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
