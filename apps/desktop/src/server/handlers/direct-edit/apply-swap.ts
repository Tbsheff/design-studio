import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applySwapDirectEdit } from "../../../shared/actions/direct-edit/apply-swap.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ApplySwapDirectEditInput = Input<typeof applySwapDirectEdit>;

const handle = Effect.fn("direct-edit.applySwap")(function* run(
  input: ApplySwapDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.applySwap(toRef(input), toBody(input));
}) satisfies Handle<typeof applySwapDirectEdit>;

export { handle };
