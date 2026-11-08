import type { Input } from "@design-studio/actions/_core/action";
import type { listSwapCandidatesDirectEdit } from "@design-studio/actions/direct-edit/list-swap-candidates";
import { Effect } from "effect";

import { toRef } from "../../direct-edit/index.js";
import { DirectEditStore } from "../../share/index.js";
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
