export { linksApi, useLinks } from "../canvas/links-api.js";

export type { LinkInteractionChange } from "../canvas/links-api.js";

export { Icon, UiSelect } from "@design-studio/ui";

export type { UiSelectOption } from "@design-studio/ui";

export type { CanvasFrame } from "../canvas/canvas-frames-model.js";

export { ACTION_LABELS } from "@design-studio/contracts/link-labels";

export {
  LINK_INTERACTION_ACTIONS,
  isFrameAction,
  linkAction,
} from "@design-studio/contracts/links";

export type {
  LinkAction,
  LinkTarget,
  PrototypeLink,
} from "@design-studio/contracts/links";

export {
  LINK_DELAY_MAX,
  LINK_SWIPE_TRIGGERS,
  LINK_TRIGGERS,
  LINK_VISIBILITIES,
  TRIGGER_LABELS,
  cleanDelay,
  cleanLinkKey,
  cleanLinkUrl,
  isSwipeKind,
  targetFrame,
} from "@design-studio/contracts/link-interaction";

export type {
  LinkBridgeTrigger,
  LinkTrigger,
  LinkTriggerKind,
  LinkVisibility,
} from "@design-studio/contracts/link-interaction";

export {
  LINK_VARIABLE_OPS,
  applyVariable,
  cleanVariableName,
  holdsWhen,
} from "@design-studio/contracts/link-variable";

export type {
  LinkVariableOp,
  LinkVariableValue,
  VariableMemory,
} from "@design-studio/contracts/link-variable";

export type { PlayRunOp } from "@design-studio/contracts";
