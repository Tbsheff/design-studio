export {
  commitBreakpointStyle as commitStackingEdit,
  guardBreakpointEdit as guardStackingEdit,
} from "../breakpoints/commit.js";

export { loadBreakpointSite as loadStackingSite } from "../breakpoints/site.js";

export { elementClassInfo } from "../direct-edit/commit/index.js";

export { htmlVariantProps } from "../direct-edit/engine/index.js";

export { planDirectEdit } from "../direct-edit/index.js";

export { prefixOf } from "../style-scope/engine/index.js";

export { BREAKPOINT_BASE, BREAKPOINT_NAME } from "../../shared/breakpoints.js";

export {
  STACKING_OVERFLOWS,
  STACKING_POSITIONS,
  STACKING_VALUE_MAX,
} from "@design-studio/contracts/stacking";

export type { BreakpointScope as StackingScope } from "../breakpoints/commit.js";

export type { BreakpointSite as StackingSite } from "../breakpoints/site.js";

export type { WrittenFile } from "../direct-edit/commit/index.js";

export type { DirectEditDeps } from "../direct-edit/index.js";

export type {
  DirectEditRequest,
  SourceLoc,
  Version,
} from "@design-studio/contracts";

export type {
  StackingChanges,
  StackingInfo,
  StackingInput,
  StackingMode,
  StackingSetResult,
  StackingValues,
} from "@design-studio/contracts/stacking";

export { z } from "../platform/zod-bridge/index.js";
