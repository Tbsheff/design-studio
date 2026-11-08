import type { Input } from "@design-studio/actions/_core/action";
import type { insertComponentDirectEdit } from "@design-studio/actions/direct-edit/insert-component";
import { Effect } from "effect";

import { toBody, toRef } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type InsertComponentDirectEditInput = Input<typeof insertComponentDirectEdit>;

const handle = Effect.fn("direct-edit.insertComponent")(function* run(
  input: InsertComponentDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.insertComponent(toRef(input), toBody(input));
}) satisfies Handle<typeof insertComponentDirectEdit>;

export { handle };
