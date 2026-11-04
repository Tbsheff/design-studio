import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listShare } from "../../../shared/actions/share/list.js";
import { ShareStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ListShareInput = Input<typeof listShare>;

const handle = Effect.fn("share.list")(function* run(input: ListShareInput) {
  const store = yield* ShareStore;

  return yield* store.list(input.projectId);
}) satisfies Handle<typeof listShare>;

export { handle };
