import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyDirectEdit } from "../../../shared/actions/direct-edit/apply.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyDirectEditInput = Input<typeof applyDirectEdit>;

const handle = Effect.fn("direct-edit.apply")(function* run(
  input: ApplyDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.apply(toRef(input), toBody(input));
}) satisfies Handle<typeof applyDirectEdit>;

export { handle };
