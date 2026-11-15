export { insertError } from "../design-system/component-insert-api.js";

export { routes as stackingRoutes } from "@design-studio/actions/stacking/routes";

export { call } from "../../platform/http.js";

export { useEditVariant } from "../inspector/index.js";

export { InspectorSection } from "../inspector/inspector-fields.js";

export { parseVariant } from "../../../shared/variants.js";

export {
  STACKING_OTHERS_MAX,
  STACKING_OVERFLOWS,
  STACKING_POSITIONS,
  STACKING_SIDES,
  Z_SCALE,
} from "@design-studio/contracts/stacking";

export { STACKING_KEY_EVENT } from "../../domain/stacking-key-events.js";

export type { StackingKeyDetail } from "../../domain/stacking-key-events.js";

export { isTypingTarget } from "../../platform/typing-target.js";

export { isMacPlatform } from "../../platform/mac.js";

export { matchesKey } from "../../../shared/keymap.js";

export type { PreviewPort } from "../../platform/bridge.js";

export type {
  AnchorQuery,
  SelectionContext,
  SelectionStack,
  SourceLoc,
  StackPeer,
} from "@design-studio/contracts";

export type {
  StackingInfo,
  StackingOverflow,
  StackingPosition,
  StackingSetResult,
  StackingSide,
  StackingValue,
} from "@design-studio/contracts/stacking";
