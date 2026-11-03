import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listPacks } from "../../../shared/actions/packs/list.js";
import { PackStore, toItemPage } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ListPacksInput = Input<typeof listPacks>;

const handle = Effect.fn("packs.list")(function* run(input: ListPacksInput) {
  const store = yield* PackStore;
  const items = yield* store.list(input.drafts === true);

  return toItemPage(items, input.cursor, input.limit);
}) satisfies Handle<typeof listPacks>;

export { handle };
