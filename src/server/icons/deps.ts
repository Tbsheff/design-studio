export { parseModuleFile } from "../components/props-schema.js";

export { writeAndCommitAll } from "../direct-edit/batch.js";

export {
  assertCanEdit,
  publishVersion,
  resolveSource,
} from "../direct-edit/index.js";

export { planInsertJsx } from "../direct-edit/jsx-insert.js";

export { positionAt } from "../direct-edit/structure-ops.js";

export {
  ICON_BUNDLED,
  ICON_LIST_DEFAULT,
  ICON_LIST_MAX,
  ICON_PACKAGES,
} from "../../shared/icons.js";

export type { InsertScope } from "../components/insert.js";

export type { DirectEditDeps } from "../direct-edit/index.js";

export type { JsxInsertPlan } from "../direct-edit/jsx-insert.js";

export type {
  Direction,
  Project,
  SourceLoc,
  Version,
} from "../../shared/contracts.js";

export type {
  IconList,
  IconPackage,
  IconPosition,
  IconSource,
  IconSummary,
} from "../../shared/icons.js";

export type { InsertTarget } from "../../shared/insert.js";
