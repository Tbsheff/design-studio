import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createComponentDirectEdit } from "../../../shared/actions/direct-edit/create-component.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type CreateComponentDirectEditInput = Input<typeof createComponentDirectEdit>;

const handle = Effect.fn("direct-edit.createComponent")(function* run(
  input: CreateComponentDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.createComponent(toRef(input), toBody(input));
}) satisfies Handle<typeof createComponentDirectEdit>;

export { handle };
