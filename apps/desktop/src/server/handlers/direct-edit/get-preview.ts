import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getPreviewDirectEdit } from "../../../shared/actions/direct-edit/get-preview.js";
import { DirectEditStore, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type GetPreviewDirectEditInput = Input<typeof getPreviewDirectEdit>;

const handle = Effect.fn("direct-edit.getPreview")(function* run(
  input: GetPreviewDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.getPreview(toRef(input));
}) satisfies Handle<typeof getPreviewDirectEdit>;

export { handle };
