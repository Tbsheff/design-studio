import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { inspectPropsInstanceDirectEdit } from "../../../shared/actions/direct-edit/inspect-props-instance.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type InspectPropsInstanceDirectEditInput = Input<
  typeof inspectPropsInstanceDirectEdit
>;

const handle = Effect.fn("direct-edit.inspectPropsInstance")(function* run(
  input: InspectPropsInstanceDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.inspectPropsInstance(toRef(input), toBody(input));
}) satisfies Handle<typeof inspectPropsInstanceDirectEdit>;

export { handle };
