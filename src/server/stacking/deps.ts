export {
  commitBreakpointStyle as commitStackingEdit,
  guardBreakpointEdit as guardStackingEdit,
} from "../breakpoints/commit.js";

export { loadBreakpointSite as loadStackingSite } from "../breakpoints/site.js";

export { elementClassInfo } from "../direct-edit/class-info.js";

export { htmlVariantProps } from "../direct-edit/engine/html.js";

export { planDirectEdit } from "../direct-edit/index.js";

export { prefixOf } from "../style-scope/engine/index.js";

export { BREAKPOINT_BASE, BREAKPOINT_NAME } from "../../shared/breakpoints.js";

export {
  STACKING_OVERFLOWS,
  STACKING_POSITIONS,
  STACKING_VALUE_MAX,
} from "../../shared/stacking.js";

export type { BreakpointScope as StackingScope } from "../breakpoints/commit.js";

export type { BreakpointSite as StackingSite } from "../breakpoints/site.js";

export type { WrittenFile } from "../direct-edit/batch.js";

export type { DirectEditDeps } from "../direct-edit/index.js";

export type {
  DirectEditRequest,
  SourceLoc,
  Version,
} from "../../shared/contracts.js";

export type {
  StackingChanges,
  StackingInfo,
  StackingInput,
  StackingMode,
  StackingSetResult,
  StackingValues,
} from "../../shared/stacking.js";
