import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setDevserver } from "../../../shared/actions/devserver/set.js";
import { DevServerRunner } from "../../app/dev-server-runner.js";
import type { Handle } from "../_core/handler.js";

type SetDevserverInput = Input<typeof setDevserver>;

const handle = Effect.fn("devserver.set")(function* run(
  input: SetDevserverInput
) {
  const service = yield* DevServerRunner;

  return yield* service.setConfig(input);
}) satisfies Handle<typeof setDevserver>;

export { handle };
