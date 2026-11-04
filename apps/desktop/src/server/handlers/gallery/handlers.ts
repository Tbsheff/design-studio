// @generated
import type { GalleryActions } from "@design-studio/actions/gallery/index";
import type { Entries } from "../_core/handler.js";
import { handle as createGalleryHandle } from "./create.js";
import { handle as inspectGalleryHandle } from "./inspect.js";

const GalleryEntries = {
  createGallery: { handle: createGalleryHandle },
  inspectGallery: { handle: inspectGalleryHandle },
} satisfies Entries<typeof GalleryActions>;

export { GalleryEntries };
