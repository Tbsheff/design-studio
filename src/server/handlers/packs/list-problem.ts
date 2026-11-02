import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listProblemPacks } from "../../../shared/actions/packs/list-problem.js";
import { toPage } from "../../design-system/ops/library-reads.js";
import { PackStore } from "../../design-system/ops/pack-store.js";
import type { Handle } from "../_core/handler.js";

type ListProblemPacksInput = Input<typeof listProblemPacks>;

const handle = Effect.fn("packs.listProblem")(function* run(
  input: ListProblemPacksInput
) {
  const store = yield* PackStore;

  const items = yield* store.problems();

  return toPage(items, input.cursor, input.limit);
}) satisfies Handle<typeof listProblemPacks>;

export { handle };
