import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listDevserver } from "../../../shared/actions/devserver/list.js";
import { DevServerStore } from "../../app/dev-server-store.js";
import type { Handle } from "../_core/handler.js";

type ListDevserverInput = Input<typeof listDevserver>;

const handle = Effect.fn("devserver.list")(function* run(
  input: ListDevserverInput
) {
  const service = yield* DevServerStore;

  return yield* service.routes(input.projectId);
}) satisfies Handle<typeof listDevserver>;

export { handle };
