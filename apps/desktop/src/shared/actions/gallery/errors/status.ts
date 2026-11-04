import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { GalleryErrorTag } from "./index.js";

const GalleryStatus = {} as const satisfies Record<GalleryErrorTag, HttpStatus>;

export { GalleryStatus };
