import type { Input } from "@design-studio/actions/_core/action";
import type { applyImageSearch } from "@design-studio/actions/image-search/apply";
import { Effect } from "effect";

import { ImageSearchWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyImageSearchInput = Input<typeof applyImageSearch>;

const handle = Effect.fn("image-search.apply")(function* run(
  input: ApplyImageSearchInput
) {
  const writer = yield* ImageSearchWriter;

  return yield* writer.apply({
    directionId: input.directionId,
    path: input.path,
    projectId: input.projectId,
    slots: input.slots,
  });
}) satisfies Handle<typeof applyImageSearch>;

export { handle };
