export type { InsertScope } from "../direct-edit/components-ops/insert.js";

export {
  assertCanEdit,
  publishVersion,
  saveDeferred,
  writeAtomic,
  writeNewFile,
} from "../direct-edit/index.js";

export type { DirectEditDeps } from "../direct-edit/index.js";

export { DirectEditError } from "../direct-edit/engine/errors.js";

export {
  parseSetImage,
  planChanged,
  planSetImage,
  writeImagePlan,
} from "../direct-edit/commit/image.js";

export type { ImagePlan } from "../direct-edit/commit/image.js";

export { imageFromUrl } from "../direct-edit/commit/image-source.js";

export type { ImageBytes } from "../direct-edit/commit/image-source.js";

export { savesSettled } from "../direct-edit/commit/save-queue.js";

export { imageSearchEnv } from "../platform/config/index.js";

export {
  IMAGE_ALT_MAX,
  IMAGE_FITS,
  IMAGE_MODES,
  imageKindOf,
} from "../../shared/image.js";

export type {
  ImageFit,
  ImageMode,
  SetImageRequest,
} from "../../shared/image.js";

export {
  ASSETS_FILE,
  IMAGE_ORIENTATIONS,
  IMAGE_QUERY_MAX,
  IMAGE_SEARCH_ENV,
  IMAGE_SEARCH_LIMIT_DEFAULT,
  IMAGE_SEARCH_LIMIT_MAX,
  IMAGE_SEARCH_SETTING,
} from "../../shared/image-search.js";

export type {
  ImageSearchHit,
  ImageSearchRequest,
  ImageSearchResult,
  PlaceImageDone,
  PlaceImageInput,
  PlaceImageResult,
} from "../../shared/image-search.js";

export type {
  Direction,
  Project,
  SourceLoc,
  Version,
  VersionMeta,
} from "../../shared/contracts.js";
