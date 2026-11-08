import type { Input } from "@design-studio/actions/_core/action";
import type { createMarkup } from "@design-studio/actions/markup/create";
import { Effect } from "effect";

import { MarkupWriter } from "../../comments/index.js";
import type { Handle } from "../_core/handler.js";

type CreateMarkupInput = Input<typeof createMarkup>;

const handle = Effect.fn("markup.create")(function* run(
  input: CreateMarkupInput
) {
  const writer = yield* MarkupWriter;

  return yield* writer.create({
    boxes: input.boxes,
    directionId: input.directionId,
    frameId: input.frameId,
    image: input.image,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof createMarkup>;

export { handle };
