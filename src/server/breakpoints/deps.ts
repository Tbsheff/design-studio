export {
  elementClassInfo,
  writeAndCommitAll,
} from "../direct-edit/commit/index.js";

export { htmlVariantProps } from "../direct-edit/engine/index.js";

export {
  assertCanEdit,
  DirectEditError,
  parseDirectEditRequest,
  planDirectEdit,
  publishVersion,
  resolveSource,
  themeForFile,
} from "../direct-edit/index.js";

export { projectTailwindTheme } from "../direct-edit/tailwind/index.js";

export {
  activeOf,
  breakpointsOf,
  classOverridesOf,
  cssOverridesOf,
  prefixOf,
  scopedStyleOf,
} from "../style-scope/engine/index.js";

export {
  BREAKPOINT_BASE,
  BREAKPOINT_NAME,
  BREAKPOINT_VALUE_MAX,
  BREAKPOINT_WIDTH_MAX,
} from "../../shared/breakpoints.js";

export { DIRECT_STYLE_PROPERTIES } from "../../shared/contracts.js";

export type { WrittenFile } from "../direct-edit/commit/index.js";

export type { DirectEditDeps } from "../direct-edit/index.js";

export type { TailwindTheme } from "../direct-edit/tailwind/index.js";

export type { BreakpointSet } from "../style-scope/engine/index.js";

export type { CanvasFileFrame } from "../../shared/canvas-file.js";

export type {
  Direction,
  DirectEditRequest,
  Project,
  SourceLoc,
  Version,
} from "../../shared/contracts.js";

export type {
  BreakpointActive,
  BreakpointLayer,
  BreakpointListResult,
  BreakpointStyleInput,
  BreakpointStyleResult,
} from "../../shared/breakpoints.js";

export { z } from "../platform/zod-bridge/index.js";
