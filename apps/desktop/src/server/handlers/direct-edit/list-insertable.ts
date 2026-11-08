import type { Input } from "@design-studio/actions/_core/action";
import type { listInsertableDirectEdit } from "@design-studio/actions/direct-edit/list-insertable";
import { Effect } from "effect";

import { toRef } from "../../direct-edit/index.js";
import { DirectEditStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ListInsertableDirectEditInput = Input<typeof listInsertableDirectEdit>;

const handle = Effect.fn("direct-edit.listInsertable")(function* run(
  input: ListInsertableDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.listInsertable(toRef(input));
}) satisfies Handle<typeof listInsertableDirectEdit>;

export { handle };
