export {
  toFileScan,
  toNamespaceEntry,
  toTokenUses,
  toUsageIndex,
} from "./count-token-uses.js";

export type {
  FileScan,
  ScannedFile,
  TokenUse,
  UsageIndex,
  UsageSite,
  UsageToken,
} from "./count-token-uses.js";

export { toTokenClasses } from "./to-token-classes.js";

export type { TokenClass } from "./to-token-classes.js";

export {
  toDeletedText,
  toRenamePlan,
  toRenamedText,
} from "./rename-token-text.js";

export type { RenamePlan, RenameResult } from "./rename-token-text.js";
