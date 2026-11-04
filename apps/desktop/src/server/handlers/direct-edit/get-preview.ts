import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { getPreviewDirectEdit } from "@design-studio/actions/direct-edit/get-preview";
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
