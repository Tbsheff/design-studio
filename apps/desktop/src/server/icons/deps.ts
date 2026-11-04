export { parseModuleFile } from "../components/props-schema.js";

export {
  planInsertJsx,
  writeAndCommitAll,
} from "../direct-edit/commit/index.js";

export {
  assertCanEdit,
  publishVersion,
  resolveSource,
} from "../direct-edit/index.js";

export { positionAt } from "../direct-edit/engine/index.js";

export {
  ICON_BUNDLED,
  ICON_LIST_DEFAULT,
  ICON_LIST_MAX,
  ICON_PACKAGES,
} from "../../shared/icons.js";

export type { InsertScope } from "../direct-edit/components-ops/index.js";

export type { DirectEditDeps } from "../direct-edit/index.js";

export type { JsxInsertPlan } from "../direct-edit/commit/index.js";

export type {
  Direction,
  Project,
  SourceLoc,
  Version,
} from "@design-studio/actions/_core/contracts";

export type {
  IconList,
  IconPackage,
  IconPosition,
  IconSource,
  IconSummary,
} from "../../shared/icons.js";

export type { InsertTarget } from "@design-studio/actions/_core/insert";

export { toDecoder } from "../platform/decode/index.js";
