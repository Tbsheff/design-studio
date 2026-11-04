export { json, replaceStyle } from "../../api.js";

export { postToFrame, useBridge } from "../../platform/bridge.js";

export { createLiveStore, useLive } from "../../platform/live-store.js";

export type { BridgeFrame } from "../../platform/bridge.js";

export { insertError } from "../design-system/component-insert-api.js";

export { InspectorSection } from "../inspector/inspector-fields.js";

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
} from "@design-studio/contracts";

export type { LinkQuery, LinkRectReport } from "@design-studio/contracts/links";

export type { StyleReplaceResult } from "@design-studio/contracts/style-search";
