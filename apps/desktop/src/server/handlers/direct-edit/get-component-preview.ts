import type { Input } from "@design-studio/actions/_core/action";
import type { getComponentPreviewDirectEdit } from "@design-studio/actions/direct-edit/get-component-preview";
import { Effect } from "effect";

import { toBody, toRef } from "../../direct-edit/index.js";
import { DirectEditStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type GetComponentPreviewDirectEditInput = Input<
  typeof getComponentPreviewDirectEdit
>;

const handle = Effect.fn("direct-edit.getComponentPreview")(function* run(
  input: GetComponentPreviewDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.getComponentPreview(toRef(input), toBody(input));
}) satisfies Handle<typeof getComponentPreviewDirectEdit>;

export { handle };
