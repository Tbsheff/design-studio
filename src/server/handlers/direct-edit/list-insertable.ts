import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listInsertableDirectEdit } from "../../../shared/actions/direct-edit/list-insertable.js";
import { DirectEditStore, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ListInsertableDirectEditInput = Input<typeof listInsertableDirectEdit>;

const handle = Effect.fn("direct-edit.listInsertable")(function* run(
  input: ListInsertableDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.listInsertable(toRef(input));
}) satisfies Handle<typeof listInsertableDirectEdit>;

export { handle };
