import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { setVariantClassesDirectEdit } from "@design-studio/actions/direct-edit/set-variant-classes";
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
