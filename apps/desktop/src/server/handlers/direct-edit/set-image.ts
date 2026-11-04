import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { setImageDirectEdit } from "@design-studio/actions/direct-edit/set-image";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type SetImageDirectEditInput = Input<typeof setImageDirectEdit>;

const handle = Effect.fn("direct-edit.setImage")(function* run(
  input: SetImageDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.setImage(toRef(input), toBody(input));
}) satisfies Handle<typeof setImageDirectEdit>;

export { handle };
