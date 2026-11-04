import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getTreeDirectEdit } from "../../../shared/actions/direct-edit/get-tree.js";
import { DirectEditStore, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type GetTreeDirectEditInput = Input<typeof getTreeDirectEdit>;

const handle = Effect.fn("direct-edit.getTree")(function* run(
  input: GetTreeDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.getTree(toRef(input));
}) satisfies Handle<typeof getTreeDirectEdit>;

export { handle };
