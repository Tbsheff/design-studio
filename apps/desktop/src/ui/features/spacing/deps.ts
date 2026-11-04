export { api, errorText } from "../../api.js";

export type {
  SpacingBox,
  SpacingComputed,
  SpacingSetBody,
  SpacingStep,
} from "../../api.js";

export type { ParentMessageBody } from "../../platform/bridge.js";

export { startOptimistic } from "../inspector/optimistic-edit.js";

export { snapOff } from "../canvas/snap-model.js";

export { resizeReadout } from "../canvas/use-resize-handles.js";

export { useLive } from "../../platform/live-store.js";

export { buildEditRequest, mergeCommit } from "../inspector/use-direct-edit.js";

export { BOX_SIDES } from "../../../shared/spacing.js";

export type { BoxSide, SpacingSide } from "../../../shared/spacing.js";

export type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/actions/_core/contracts";
