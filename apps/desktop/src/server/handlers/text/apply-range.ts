import type { Input } from "@design-studio/actions/_core/action";
import type { applyRangeText } from "@design-studio/actions/text/apply-range";
import { Effect } from "effect";

import { TextSearchWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyRangeTextInput = Input<typeof applyRangeText>;

const handle = Effect.fn("text.applyRange")(function* run(
  input: ApplyRangeTextInput
) {
  const writer = yield* TextSearchWriter;

  return yield* writer.applyRange({
    directionId: input.directionId,
    projectId: input.projectId,
    request: {
      className: input.className,
      end: input.end,
      href: input.href,
      isRemove: input.isRemove,
      layer: input.layer,
      start: input.start,
      style: input.style,
      text: input.text,
    },
  });
}) satisfies Handle<typeof applyRangeText>;

export { handle };
