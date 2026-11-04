import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { inspectPropsInstanceDirectEdit } from "@design-studio/actions/direct-edit/inspect-props-instance";
import { DirectEditStore, toFields, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type InspectPropsInstanceDirectEditInput = Input<
  typeof inspectPropsInstanceDirectEdit
>;

const handle = Effect.fn("direct-edit.inspectPropsInstance")(function* run(
  input: InspectPropsInstanceDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.inspectPropsInstance(toRef(input), toFields(input));
}) satisfies Handle<typeof inspectPropsInstanceDirectEdit>;

export { handle };
