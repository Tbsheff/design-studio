import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listSummaryPacks } from "../../../shared/actions/packs/list-summary.js";
import { toPage } from "../../design-system/ops/library-reads.js";
import { PackStore } from "../../design-system/ops/pack-store.js";
import type { Handle } from "../_core/handler.js";

type ListSummaryPacksInput = Input<typeof listSummaryPacks>;

const handle = Effect.fn("packs.listSummary")(function* run(
  input: ListSummaryPacksInput
) {
  const store = yield* PackStore;

  const items = yield* store.summaries();

  return toPage(items, input.cursor, input.limit);
}) satisfies Handle<typeof listSummaryPacks>;

export { handle };
