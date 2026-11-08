export { api } from "../../api.js";

export { insertError } from "../design-system/component-insert-api.js";

export type { MotionSetBody, MotionSpecBody } from "../../api.js";

export type { PreviewPort } from "../../platform/bridge.js";

export { setForceState, useEditVariant } from "../inspector/index.js";

export { InspectorSection } from "../inspector/inspector-fields.js";

export type { SelectionContext } from "@design-studio/contracts";

export {
  EASING_PRESETS,
  ENTRANCE_PRESETS,
  MOTION_DELAY_MAX,
  MOTION_DURATION_MAX,
  MOTION_STAGGER_MAX,
  MOTION_STATES,
} from "@design-studio/contracts/motion";

export type {
  EntrancePreset,
  MotionInfo,
  MotionKind,
  MotionState,
} from "@design-studio/contracts/motion";

export { parseVariant } from "../../../shared/variants.js";
