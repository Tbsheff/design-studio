import type { Input } from "@design-studio/actions/_core/action";
import type { createComponentDirectEdit } from "@design-studio/actions/direct-edit/create-component";
import { Effect } from "effect";

import { toBody, toRef } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type CreateComponentDirectEditInput = Input<typeof createComponentDirectEdit>;

const handle = Effect.fn("direct-edit.createComponent")(function* run(
  input: CreateComponentDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.createComponent(toRef(input), toBody(input));
}) satisfies Handle<typeof createComponentDirectEdit>;

export { handle };
