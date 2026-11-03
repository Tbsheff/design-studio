import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getDevserver } from "../../../shared/actions/devserver/get.js";
import { DevServerStore } from "../../app/dev-server-store.js";
import type { Handle } from "../_core/handler.js";

type GetDevserverInput = Input<typeof getDevserver>;

const handle = Effect.fn("devserver.get")(function* run(
  input: GetDevserverInput
) {
  const service = yield* DevServerStore;

  return yield* service.view(input.projectId);
}) satisfies Handle<typeof getDevserver>;

export { handle };
