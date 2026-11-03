import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listProblemPack } from "../../../shared/actions/pack/list-problem.js";
import { PackStore, toPage } from "../../design-system/index.js";
import type { Handle } from "../_core/handler.js";

type ListProblemPackInput = Input<typeof listProblemPack>;

const handle = Effect.fn("pack.listProblem")(function* run(
  input: ListProblemPackInput
) {
  const store = yield* PackStore;

  const items = yield* store.problems();

  return toPage(items, input.cursor, input.limit);
}) satisfies Handle<typeof listProblemPack>;

export { handle };
