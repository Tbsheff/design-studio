import type { Input } from "@design-studio/actions/_core/action";
import type { getReviewDirectEdit } from "@design-studio/actions/direct-edit/get-review";
import { Effect } from "effect";

import { toRef } from "../../direct-edit/index.js";
import { DirectEditStore } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type GetReviewDirectEditInput = Input<typeof getReviewDirectEdit>;

const handle = Effect.fn("direct-edit.getReview")(function* run(
  input: GetReviewDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.getReview(toRef(input));
}) satisfies Handle<typeof getReviewDirectEdit>;

export { handle };
