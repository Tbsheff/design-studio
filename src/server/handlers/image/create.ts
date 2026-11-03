import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createImage } from "../../../shared/actions/image/create.js";
import { ImageGeneratorRunner } from "../../image-generate/index.js";
import type { Handle } from "../_core/handler.js";

type CreateImageInput = Input<typeof createImage>;

const handle = Effect.fn("image.create")(function* run(
  input: CreateImageInput
) {
  const generator = yield* ImageGeneratorRunner;

  return yield* generator.create({
    aspect: input.aspect ?? "square",
    directionId: input.directionId,
    layer: input.layer ?? null,
    projectId: input.projectId,
    prompt: input.prompt,
    reuse: input.reuse ?? null,
    seed: input.seed ?? 0,
    style: input.style ?? "photo",
  });
}) satisfies Handle<typeof createImage>;

export { handle };
