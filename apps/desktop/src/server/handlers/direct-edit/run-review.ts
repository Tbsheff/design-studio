import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { runReviewDirectEdit } from "../../../shared/actions/direct-edit/run-review.js";
import { DirectEditWriter, toFields, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type RunReviewDirectEditInput = Input<typeof runReviewDirectEdit>;

const handle = Effect.fn("direct-edit.runReview")(function* run(
  input: RunReviewDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.runReview(toRef(input), toFields(input));
}) satisfies Handle<typeof runReviewDirectEdit>;

export { handle };
