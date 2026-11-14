export { toDecoder } from "../../platform/decode/index.js";

export {
  assertCanEdit,
  elementClassInfo,
  parseDirectEditRequest,
  planDirectEdit,
  publishVersion,
  resolveSource,
  writeAndCommitAll,
} from "../../direct-edit/index.js";

export { parseClass } from "../../direct-edit/engine/index.js";

export { normalizeVariant } from "../../../shared/variants.js";

export type { DirectEditDeps, WrittenFile } from "../../direct-edit/index.js";

export type {
  EffectChange,
  EffectInfo,
  EffectItem,
  EffectStyle,
  EffectStyleDeleted,
  EffectStyleSaved,
} from "@design-studio/actions/effect/schema";

export type { Direction, Project, Version } from "@design-studio/contracts";
