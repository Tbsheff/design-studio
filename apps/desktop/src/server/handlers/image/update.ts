import type { Input } from "@design-studio/actions/_core/action";
import type { updateImage } from "@design-studio/actions/image/update";
import { Effect } from "effect";

import { ImageGeneratorRunner } from "../../image-generate/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateImageInput = Input<typeof updateImage>;

const handle = Effect.fn("image.update")(function* run(
  input: UpdateImageInput
) {
  const generator = yield* ImageGeneratorRunner;

  return yield* generator.update({
    aspect: input.aspect,
    box: input.box,
    directionId: input.directionId,
    layer: input.layer,
    mode: input.mode,
    projectId: input.projectId,
    prompt: input.prompt,
  });
}) satisfies Handle<typeof updateImage>;

export { handle };
