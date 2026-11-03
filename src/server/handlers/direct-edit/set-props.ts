import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setPropsDirectEdit } from "../../../shared/actions/direct-edit/set-props.js";
import { DirectEditWriter, toFields, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type SetPropsDirectEditInput = Input<typeof setPropsDirectEdit>;

const handle = Effect.fn("direct-edit.setProps")(function* run(
  input: SetPropsDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.setProps(toRef(input), toFields(input));
}) satisfies Handle<typeof setPropsDirectEdit>;

export { handle };
