import type { Input } from "@design-studio/actions/_core/action";
import type { applyDirectEdit } from "@design-studio/actions/direct-edit/apply";
import { Effect } from "effect";

import { toBody, toRef } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyDirectEditInput = Input<typeof applyDirectEdit>;

const handle = Effect.fn("direct-edit.apply")(function* run(
  input: ApplyDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.apply(toRef(input), toBody(input));
}) satisfies Handle<typeof applyDirectEdit>;

export { handle };
