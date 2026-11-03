import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { deleteTextDirectEdit } from "../../../shared/actions/direct-edit/delete-text.js";
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
