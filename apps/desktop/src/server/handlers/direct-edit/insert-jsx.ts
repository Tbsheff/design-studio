import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { insertJsxDirectEdit } from "@design-studio/actions/direct-edit/insert-jsx";
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
