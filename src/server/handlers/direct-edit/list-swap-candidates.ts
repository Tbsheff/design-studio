import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listSwapCandidatesDirectEdit } from "../../../shared/actions/direct-edit/list-swap-candidates.js";
import { DirectEditStore, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ListSwapCandidatesDirectEditInput = Input<
  typeof listSwapCandidatesDirectEdit
>;

const handle = Effect.fn("direct-edit.listSwapCandidates")(function* run(
  input: ListSwapCandidatesDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.listSwapCandidates(toRef(input), {
    col: input.col,
    file: input.file,
    line: input.line,
  });
}) satisfies Handle<typeof listSwapCandidatesDirectEdit>;

export { handle };
