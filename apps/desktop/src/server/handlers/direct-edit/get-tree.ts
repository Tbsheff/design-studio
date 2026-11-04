import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getTreeDirectEdit } from "@design-studio/actions/direct-edit/get-tree";
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
