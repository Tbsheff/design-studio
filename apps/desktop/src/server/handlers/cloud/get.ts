import type { Input } from "@design-studio/actions/_core/action";
import type { getCloud } from "@design-studio/actions/cloud/get";
import { Effect } from "effect";

import { CloudSessionStore } from "../../cloud/index.js";
import type { Handle } from "../_core/handler.js";

type GetCloudInput = Input<typeof getCloud>;

const handle = Effect.fn("cloud.get")(function* run(_input: GetCloudInput) {
  const store = yield* CloudSessionStore;

  return yield* store.current();
}) satisfies Handle<typeof getCloud>;

export { handle };
