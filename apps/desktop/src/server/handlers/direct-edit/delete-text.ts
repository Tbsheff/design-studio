import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { deleteTextDirectEdit } from "@design-studio/actions/direct-edit/delete-text";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type DeleteTextDirectEditInput = Input<typeof deleteTextDirectEdit>;

const handle = Effect.fn("direct-edit.deleteText")(function* run(
  input: DeleteTextDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.deleteText(toRef(input), toBody(input));
}) satisfies Handle<typeof deleteTextDirectEdit>;

export { handle };
