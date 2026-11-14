import type { Input } from "@design-studio/actions/_core/action";
import type { listProblemPack } from "@design-studio/actions/pack/list-problem";
import { Effect } from "effect";

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
