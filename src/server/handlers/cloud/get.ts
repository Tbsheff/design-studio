import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getCloud } from "../../../shared/actions/cloud/get.js";
import { CloudSessionStore } from "../../cloud/index.js";
import type { Handle } from "../_core/handler.js";

type GetCloudInput = Input<typeof getCloud>;

const handle = Effect.fn("cloud.get")(function* run(_input: GetCloudInput) {
  const store = yield* CloudSessionStore;

  return yield* store.current();
}) satisfies Handle<typeof getCloud>;

export { handle };
