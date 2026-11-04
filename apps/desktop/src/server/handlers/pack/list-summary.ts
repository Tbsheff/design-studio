import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { listSummaryPack } from "@design-studio/actions/pack/list-summary";
import { PackStore, toPage } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ListSummaryPackInput = Input<typeof listSummaryPack>;

const handle = Effect.fn("pack.listSummary")(function* run(
  input: ListSummaryPackInput
) {
  const store = yield* PackStore;

  const items = yield* store.summaries();

  return toPage(items, input.cursor, input.limit);
}) satisfies Handle<typeof listSummaryPack>;

export { handle };
