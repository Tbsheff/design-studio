import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { applyReviewFixDirectEdit } from "@design-studio/actions/direct-edit/apply-review-fix";
import { DirectEditWriter, toFields, toRef } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyReviewFixDirectEditInput = Input<typeof applyReviewFixDirectEdit>;

const handle = Effect.fn("direct-edit.applyReviewFix")(function* run(
  input: ApplyReviewFixDirectEditInput
) {
  const service = yield* DirectEditWriter;

  return yield* service.applyReviewFix(toRef(input), toFields(input));
}) satisfies Handle<typeof applyReviewFixDirectEdit>;

export { handle };
