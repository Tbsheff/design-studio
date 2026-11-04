import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { listShare } from "@design-studio/actions/share/list";
import { ShareStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ListShareInput = Input<typeof listShare>;

const handle = Effect.fn("share.list")(function* run(input: ListShareInput) {
  const store = yield* ShareStore;

  return yield* store.list(input.projectId);
}) satisfies Handle<typeof listShare>;

export { handle };
