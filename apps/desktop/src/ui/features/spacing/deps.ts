export { api, errorText } from "../../api.js";

export type {
  SpacingBox,
  SpacingComputed,
  SpacingSetBody,
  SpacingStep,
} from "../../api.js";

export type { ParentMessageBody } from "../../platform/bridge.js";

export { snapOff } from "../canvas/snap-model.js";

export { resizeReadout } from "../canvas/use-resize-handles.js";

export { useLive } from "../../platform/live-store.js";

export {
  applyCommit,
  createCurrentEditRequest,
  startOptimistic,
} from "../inspector/index.js";

export { BOX_SIDES } from "@design-studio/contracts/spacing";

export type { BoxSide, SpacingSide } from "@design-studio/contracts/spacing";

export type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/contracts";
