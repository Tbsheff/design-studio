import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyReviewFixDirectEdit } from "../../../shared/actions/direct-edit/apply-review-fix.js";
import { DirectEditWriter, toBody, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyReviewFixDirectEditInput = Input<typeof applyReviewFixDirectEdit>;

const handle = Effect.fn("direct-edit.applyReviewFix")(function* run(
  input: ApplyReviewFixDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.applyReviewFix(toRef(input), toBody(input));
}) satisfies Handle<typeof applyReviewFixDirectEdit>;

export { handle };
