export { api, errorText } from "../../api.js";

export type {
  SpacingBox,
  SpacingComputed,
  SpacingSetBody,
  SpacingStep,
} from "../../api.js";

export type { ParentMessageBody } from "../../bridge.js";

export { startOptimistic } from "../../optimisticEdit.js";

export { snapOff } from "../../snap.js";

export { resizeReadout } from "../../useResizeHandles.js";

export { useLive } from "../../platform/live-store";

export { buildEditRequest, mergeCommit } from "../../useDirectEdit.js";

export { BOX_SIDES } from "../../../shared/spacing.js";

export type { BoxSide, SpacingSide } from "../../../shared/spacing.js";

export type {
  BridgeToParent,
  SelectionContext,
} from "../../../shared/contracts.js";
