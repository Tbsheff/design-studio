export { routes as accessibilityRoutes } from "@design-studio/actions/accessibility/routes";

export { api, replaceStyle } from "../../api.js";

export { routes as projectRoutes } from "@design-studio/actions/project/routes";

export { call } from "../../platform/http.js";

export { postToFrame, useBridge } from "../../platform/bridge.js";

export { createLiveStore, useLive } from "../../platform/live-store.js";

export type { BridgeFrame } from "../../platform/bridge.js";

export { insertError } from "../design-system/component-insert-api.js";

export {
  ACCESSIBILITY_LABEL_MAX,
  ACCESSIBILITY_LIST_MAX,
  ACCESSIBILITY_ROLES,
  TAB_INDEX_MAX,
  TAB_INDEX_MIN,
} from "@design-studio/contracts/accessibility";

export type {
  WireInput,
  WireOutput,
} from "@design-studio/actions/_core/action";

export type { listReaderLinesAccessibility } from "@design-studio/actions/accessibility/list-reader-lines";

export type { runVisionAccessibility } from "@design-studio/actions/accessibility/run-vision";

export type {
  AccessibilityChanges,
  AccessibilityReport,
  AccessibilityRole,
  AccessibilitySetResult,
  AccessibleNode,
  ContrastFix,
  ContrastPair,
  TabStop,
} from "@design-studio/contracts/accessibility";

export type {
  BridgeToParent,
  ProjectKind,
  SelectionContext,
} from "@design-studio/contracts";

export type { LinkQuery, LinkRectReport } from "@design-studio/contracts/links";

export type { StyleReplaceResult } from "@design-studio/contracts/style-search";
