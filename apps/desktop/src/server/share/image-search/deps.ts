export type { InsertScope } from "../../direct-edit/components-ops/index.js";

export {
  assertCanEdit,
  planAsset,
  publishVersion,
  resolveSource,
  saveDeferred,
  setHtmlAttrs,
  setJsxAttrs,
  writeAtomic,
  writeNewFile,
} from "../../direct-edit/index.js";

export type { AttrChanges, DirectEditDeps } from "../../direct-edit/index.js";

export {
  DirectEditError,
  parseSource,
} from "../../direct-edit/engine/index.js";

export {
  imageFromUrl,
  parseSetImage,
  planChanged,
  planSetImage,
  savesSettled,
  writeImagePlan,
} from "../../direct-edit/commit/index.js";

export type { ImageBytes, ImagePlan } from "../../direct-edit/commit/index.js";

export { imageSearchEnv } from "../../platform/config/index.js";

export {
  IMAGE_ALT_MAX,
  IMAGE_FITS,
  IMAGE_MODES,
  imageKindOf,
} from "../../../shared/image.js";

export type {
  ImageFit,
  ImageMode,
  SetImageRequest,
} from "../../../shared/image.js";

export {
  ASSETS_FILE,
  IMAGE_ORIENTATIONS,
  IMAGE_QUERY_MAX,
  IMAGE_SEARCH_ENV,
  IMAGE_SEARCH_LIMIT_DEFAULT,
  IMAGE_SEARCH_LIMIT_MAX,
  IMAGE_SEARCH_SETTING,
} from "@design-studio/contracts/image-search";

export type {
  ImageOrientation,
  ImageSearchHit,
  ImageSearchRequest,
  ImageSearchResult,
  PlaceImageDone,
  PlaceImageInput,
  PlaceImageResult,
} from "@design-studio/contracts/image-search";

export type {
  Direction,
  Project,
  SourceLoc,
  Version,
  VersionMeta,
} from "@design-studio/contracts";

export { toDecoder } from "../../platform/decode/index.js";

export { isOwnAgentRun } from "../../platform/call-origin/index.js";

export { runFileLockGuard } from "../../platform/path-lock/index.js";
