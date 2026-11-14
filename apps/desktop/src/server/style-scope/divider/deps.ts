export {
  elementClassInfo,
  writeAndCommitAll,
} from "../../direct-edit/commit/index.js";

export {
  assertCanEdit,
  parseDirectEditRequest,
  planDirectEdit,
  publishVersion,
  resolveSource,
  themeForFile,
} from "../../direct-edit/index.js";

export {
  parseClass,
  toChildRulePatch,
  toChildRuleProps,
} from "../../direct-edit/engine/index.js";

export { normalizeVariant } from "../../../shared/variants.js";

export type { WrittenFile } from "../../direct-edit/commit/index.js";

export type { DirectEditDeps } from "../../direct-edit/index.js";

export type {
  Direction,
  DirectEditRequest,
  Project,
  SourceLoc,
  Version,
} from "@design-studio/contracts";
