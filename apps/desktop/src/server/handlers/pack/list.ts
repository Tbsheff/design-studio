import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listPack } from "../../../shared/actions/pack/list.js";
import { PackStore, toItemPage } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ListPackInput = Input<typeof listPack>;

const handle = Effect.fn("pack.list")(function* run(input: ListPackInput) {
  const store = yield* PackStore;
  const items = yield* store.list(input.drafts === true);

  return toItemPage(items, input.cursor, input.limit);
}) satisfies Handle<typeof listPack>;

export { handle };
