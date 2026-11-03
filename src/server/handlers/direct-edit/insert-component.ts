import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { insertComponentDirectEdit } from "../../../shared/actions/direct-edit/insert-component.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type InsertComponentDirectEditInput = Input<typeof insertComponentDirectEdit>;

const handle = Effect.fn("direct-edit.insertComponent")(function* run(
  input: InsertComponentDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.insertComponent(toRef(input), toBody(input));
}) satisfies Handle<typeof insertComponentDirectEdit>;

export { handle };
