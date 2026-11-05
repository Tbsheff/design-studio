import type { Input } from "@design-studio/actions/_core/action";
import type { createTextStyle } from "@design-studio/actions/text-style/create";
import { Effect } from "effect";

import { TextStyleWriter } from "../../direct-edit/index.js";
import type { Handle } from "../_core/handler.js";

type CreateTextStyleInput = Input<typeof createTextStyle>;

const handle = Effect.fn("text-style.create")(function* run(
  input: CreateTextStyleInput
) {
  const writer = yield* TextStyleWriter;

  return yield* writer.create({
    directionId: input.directionId,
    name: input.name,
    path: input.path ?? null,
    projectId: input.projectId,
    selector: input.selector ?? null,
    styles: input.styles ?? null,
  });
}) satisfies Handle<typeof createTextStyle>;

export { handle };
