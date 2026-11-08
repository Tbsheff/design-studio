import type { Input } from "@design-studio/actions/_core/action";
import type { listPropsComponentsDirectEdit } from "@design-studio/actions/direct-edit/list-props-components";
import { Effect } from "effect";

import { toFields, toRef } from "../../direct-edit/index.js";
import { DirectEditStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ListPropsComponentsDirectEditInput = Input<
  typeof listPropsComponentsDirectEdit
>;

const handle = Effect.fn("direct-edit.listPropsComponents")(function* run(
  input: ListPropsComponentsDirectEditInput
) {
  const service = yield* DirectEditStore;

  const list = yield* service.listPropsComponents(
    toRef(input),
    toFields(input)
  );

  return { items: list.components, next: list.nextCursor };
}) satisfies Handle<typeof listPropsComponentsDirectEdit>;

export { handle };
