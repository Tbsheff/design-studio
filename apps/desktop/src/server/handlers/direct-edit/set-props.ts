import type { Input } from "@design-studio/actions/_core/action";
import type { setPropsDirectEdit } from "@design-studio/actions/direct-edit/set-props";
import { Effect } from "effect";

import { toFields, toRef } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type SetPropsDirectEditInput = Input<typeof setPropsDirectEdit>;

const handle = Effect.fn("direct-edit.setProps")(function* run(
  input: SetPropsDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.setProps(toRef(input), toFields(input));
}) satisfies Handle<typeof setPropsDirectEdit>;

export { handle };
