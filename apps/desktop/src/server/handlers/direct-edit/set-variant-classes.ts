import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setVariantClassesDirectEdit } from "../../../shared/actions/direct-edit/set-variant-classes.js";
import { DirectEditWriter, toFields, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type SetVariantClassesDirectEditInput = Input<
  typeof setVariantClassesDirectEdit
>;

const handle = Effect.fn("direct-edit.setVariantClasses")(function* run(
  input: SetVariantClassesDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.setVariantClasses(toRef(input), toFields(input));
}) satisfies Handle<typeof setVariantClassesDirectEdit>;

export { handle };
