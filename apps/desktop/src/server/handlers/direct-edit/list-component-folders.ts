import type { Input } from "@design-studio/actions/_core/action";
import type { listComponentFoldersDirectEdit } from "@design-studio/actions/direct-edit/list-component-folders";
import { Effect } from "effect";

import { toRef } from "../../direct-edit/index.js";
import { DirectEditStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ListComponentFoldersDirectEditInput = Input<
  typeof listComponentFoldersDirectEdit
>;

const handle = Effect.fn("direct-edit.listComponentFolders")(function* run(
  input: ListComponentFoldersDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.listComponentFolders(toRef(input));
}) satisfies Handle<typeof listComponentFoldersDirectEdit>;

export { handle };
