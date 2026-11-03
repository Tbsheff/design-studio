import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { listPropsComponentsDirectEdit } from "../../../shared/actions/direct-edit/list-props-components.js";
import { DirectEditStore, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ListPropsComponentsDirectEditInput = Input<
  typeof listPropsComponentsDirectEdit
>;

const handle = Effect.fn("direct-edit.listPropsComponents")(function* run(
  input: ListPropsComponentsDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.listPropsComponents(toRef(input), toBody(input));
}) satisfies Handle<typeof listPropsComponentsDirectEdit>;

export { handle };
