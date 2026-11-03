import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { createGallery } from "../../../shared/actions/gallery/create.js";
import { GalleryWriter } from "../../gallery/index.js";
import type { Handle } from "../_core/handler.js";

type CreateGalleryInput = Input<typeof createGallery>;

const handle = Effect.fn("gallery.create")(function* run(
  input: CreateGalleryInput
) {
  const writer = yield* GalleryWriter;

  return yield* writer.create({
    component: input.component,
    directionId: input.directionId,
    file: input.file ?? null,
    projectId: input.projectId,
    props: input.props ?? {},
    schemes: input.schemes,
    states: input.states ?? [],
  });
}) satisfies Handle<typeof createGallery>;

export { handle };
