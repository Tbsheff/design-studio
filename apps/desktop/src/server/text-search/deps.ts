export { writeAndCommitAll } from "../direct-edit/commit/index.js";

export {
  assertCanEdit,
  publishVersion,
  writeAtomic,
} from "../direct-edit/index.js";

export { listAppRoutes, matchRouteFile } from "../app/routes.js";

export {
  TEXT_SEARCH_ATTRIBUTES,
  TEXT_SEARCH_FILE_BYTES_MAX,
  TEXT_SEARCH_FILES_MAX,
  TEXT_SEARCH_GLOB_MAX,
  TEXT_SEARCH_HITS_MAX,
  TEXT_SEARCH_IDS_MAX,
  TEXT_SEARCH_QUERY_MAX,
  TEXT_SEARCH_REPLACE_MAX,
} from "@design-studio/contracts/text-search";

export type { WrittenFile } from "../direct-edit/commit/index.js";

export type { DirectEditDeps, EditRecorder } from "../direct-edit/index.js";

export type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";

export type { Direction, Project, Version } from "@design-studio/contracts";

export type {
  TextHit,
  TextHitKind,
  TextLayer,
  TextSearchQuery,
  TextSearchResult,
  TextSkip,
  TextUpdateRequest,
  TextUpdateResult,
} from "@design-studio/contracts/text-search";
