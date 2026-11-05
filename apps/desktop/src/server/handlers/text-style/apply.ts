import type { Input } from "@design-studio/actions/_core/action";
import type { applyTextStyle } from "@design-studio/actions/text-style/apply";
import { Effect } from "effect";

import { TextStyleWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyTextStyleInput = Input<typeof applyTextStyle>;

const handle = Effect.fn("text-style.apply")(function* run(
  input: ApplyTextStyleInput
) {
  const writer = yield* TextStyleWriter;
  const { target } = input;

  return yield* writer.apply({
    directionId: input.directionId,
    projectId: input.projectId,
    selector: target.selector ?? null,
    source: target.source,
    style: input.style,
    tag: target.tag ?? null,
  });
}) satisfies Handle<typeof applyTextStyle>;

export { handle };
