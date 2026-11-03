import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { insertJsxDirectEdit } from "../../../shared/actions/direct-edit/insert-jsx.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type InsertJsxDirectEditInput = Input<typeof insertJsxDirectEdit>;

const handle = Effect.fn("direct-edit.insertJsx")(function* run(
  input: InsertJsxDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.insertJsx(toRef(input), toBody(input));
}) satisfies Handle<typeof insertJsxDirectEdit>;

export { handle };
