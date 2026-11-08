import type { Input } from "@design-studio/actions/_core/action";
import type { updateTextStyle } from "@design-studio/actions/text-style/update";
import { Effect } from "effect";

import { TextStyleWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateTextStyleInput = Input<typeof updateTextStyle>;

const handle = Effect.fn("text-style.update")(function* run(
  input: UpdateTextStyleInput
) {
  const writer = yield* TextStyleWriter;
  const { target } = input;

  return yield* writer.detach({
    directionId: input.directionId,
    path: input.path ?? null,
    projectId: input.projectId,
    selector: input.selector ?? target?.selector ?? null,
    source: target?.source ?? null,
    styles: input.styles ?? null,
    tag: target?.tag ?? null,
  });
}) satisfies Handle<typeof updateTextStyle>;

export { handle };
