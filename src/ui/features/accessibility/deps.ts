export { json, replaceStyle } from "../../api.js";

export { postToFrame, useBridge } from "../../bridge.js";

export type { BridgeFrame } from "../../bridge.js";

export { insertError } from "../../componentInsert.js";

export { InspectorSection } from "../../components/InspectorFields.js";

export {
  ACCESSIBILITY_LABEL_MAX,
  ACCESSIBILITY_ROLES,
  TAB_INDEX_MAX,
  TAB_INDEX_MIN,
} from "../../../shared/accessibility.js";

export type {
  AccessibilityChanges,
  AccessibilityReport,
  AccessibilityRole,
  AccessibilitySetResult,
  AccessibleNode,
  ContrastFix,
  ContrastPair,
  TabStop,
} from "../../../shared/accessibility.js";

export type {
  BridgeToParent,
  ProjectKind,
  SelectionContext,
} from "../../../shared/contracts.js";

export type { LinkQuery, LinkRectReport } from "../../../shared/links.js";

export type { StyleReplaceResult } from "../../../shared/style-search.js";
