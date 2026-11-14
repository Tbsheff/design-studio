export {
  SCALE_PROPERTIES,
  classify,
  htmlElementSpan,
  jsxElementSpan,
  parseClass,
  positionAt,
  toScaledStyles,
} from "../../direct-edit/engine/index.js";

export {
  applyDirectEditBatch,
  assertCanEdit,
  elementClassInfo,
  parseDirectEditRequest,
  patchSource,
  publishVersion,
  resolveSource,
  runDirectionRead,
  runDirectionWrite,
  themeForFile,
  toDirectEditStatusFailure,
  writeAndCommitAll,
} from "../../direct-edit/index.js";

export {
  EditError,
  LayerRefError,
  describeElements,
  isLayerRef,
  memoPage,
  parseLoc,
  probeOnPage,
  resolveLayerRefs,
  resolveSourceLoc,
  scopeOf,
  toProbeTarget,
} from "../../page-probe/index.js";

export { withPagePath } from "../../project-source/index.js";

export { normalizeVariant } from "../../../shared/variants.js";

export {
  DIRECT_STYLE_PROPERTIES,
  SOURCE_LOC_ATTR,
} from "@design-studio/contracts";

export type {
  Classified,
  TailwindTheme,
} from "../../direct-edit/engine/index.js";

export type {
  DirectEditRuntime,
  DirectEditStatusFailure,
  DirectionIds,
  DirectionRun,
  WrittenFile,
} from "../../direct-edit/index.js";

export type {
  ComponentUse,
  DirectEditRequest,
  Direction,
  Project,
  SourceLoc,
} from "@design-studio/contracts";
