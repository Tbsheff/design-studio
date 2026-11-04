import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getComponentPreviewDirectEdit } from "../../../shared/actions/direct-edit/get-component-preview.js";
import { DirectEditStore, toBody, toRef } from "../../direct-edit/index.js";
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
