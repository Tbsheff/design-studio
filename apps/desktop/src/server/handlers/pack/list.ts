import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { listPack } from "@design-studio/actions/pack/list";
import { PackStore, toItemPage } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ListPackInput = Input<typeof listPack>;

const handle = Effect.fn("pack.list")(function* run(input: ListPackInput) {
  const store = yield* PackStore;
  const items = yield* store.list(input.drafts === true);

  return toItemPage(items, input.cursor, input.limit);
}) satisfies Handle<typeof listPack>;

export { handle };
