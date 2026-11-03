import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listSwapCandidatesDirectEdit } from "../../../shared/actions/direct-edit/list-swap-candidates.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ListSwapCandidatesDirectEditInput = Input<
  typeof listSwapCandidatesDirectEdit
>;

const handle = Effect.fn("direct-edit.listSwapCandidates")(function* run(
  input: ListSwapCandidatesDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.listSwapCandidates(toRef(input), toBody(input));
}) satisfies Handle<typeof listSwapCandidatesDirectEdit>;

export { handle };
