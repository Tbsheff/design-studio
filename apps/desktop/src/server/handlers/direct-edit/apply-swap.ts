import type { Input } from "@design-studio/actions/_core/action";
import type { applySwapDirectEdit } from "@design-studio/actions/direct-edit/apply-swap";
import { Effect } from "effect";

import { toBody, toRef } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ApplySwapDirectEditInput = Input<typeof applySwapDirectEdit>;

const handle = Effect.fn("direct-edit.applySwap")(function* run(
  input: ApplySwapDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.applySwap(toRef(input), toBody(input));
}) satisfies Handle<typeof applySwapDirectEdit>;

export { handle };
