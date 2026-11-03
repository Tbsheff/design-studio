// @generated
import type { GalleryActions } from "../../../shared/actions/gallery/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as createGalleryHandle } from "./create.js";
import { handle as inspectGalleryHandle } from "./inspect.js";

const GalleryEntries = {
  createGallery: { handle: createGalleryHandle },
  inspectGallery: { handle: inspectGalleryHandle },
} satisfies Entries<typeof GalleryActions>;

export { GalleryEntries };
