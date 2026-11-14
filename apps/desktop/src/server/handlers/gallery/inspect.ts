import type { Input } from "@design-studio/actions/_core/action";
import type { inspectGallery } from "@design-studio/actions/gallery/inspect";
import { Effect } from "effect";

import { GalleryStore } from "../../gallery/index.js";
import type { Handle } from "../_core/handler.js";

type InspectGalleryInput = Input<typeof inspectGallery>;

const handle = Effect.fn("gallery.inspect")(function* run(
  input: InspectGalleryInput
) {
  const reader = yield* GalleryStore;

  return yield* reader.inspect({
    component: input.component,
    directionId: input.directionId,
    file: input.file,
    projectId: input.projectId,
  });
}) satisfies Handle<typeof inspectGallery>;

export { handle };
