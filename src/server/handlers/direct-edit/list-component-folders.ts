import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listComponentFoldersDirectEdit } from "../../../shared/actions/direct-edit/list-component-folders.js";
import { DirectEditStore, toRef } from "../../direct-edit/index.js";
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
