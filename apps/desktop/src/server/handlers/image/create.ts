import type { Input } from "@design-studio/actions/_core/action";
import type { createImage } from "@design-studio/actions/image/create";
import { Effect } from "effect";

import { ImageGeneratorRunner } from "../../image-generate/index.js";
import type { Handle } from "../_core/handler.js";

type CreateImageInput = Input<typeof createImage>;

const handle = Effect.fn("image.create")(function* run(
  input: CreateImageInput
) {
  const generator = yield* ImageGeneratorRunner;

  return yield* generator.create({
    aspect: input.aspect,
    directionId: input.directionId,
    layer: input.layer,
    projectId: input.projectId,
    prompt: input.prompt,
    reuse: input.reuse,
    seed: input.seed,
    style: input.style,
  });
}) satisfies Handle<typeof createImage>;

export { handle };
