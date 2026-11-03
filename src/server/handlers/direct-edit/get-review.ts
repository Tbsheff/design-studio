import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { getReviewDirectEdit } from "../../../shared/actions/direct-edit/get-review.js";
import { DirectEditStore, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type GetReviewDirectEditInput = Input<typeof getReviewDirectEdit>;

const handle = Effect.fn("direct-edit.getReview")(function* run(
  input: GetReviewDirectEditInput
) {
  const service = yield* DirectEditStore;

  return yield* service.getReview(toRef(input));
}) satisfies Handle<typeof getReviewDirectEdit>;

export { handle };
