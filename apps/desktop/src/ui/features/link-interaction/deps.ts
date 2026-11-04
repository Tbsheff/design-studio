export { linksApi } from "../canvas/links-api.js";

export type { LinkInteractionChange } from "../canvas/links-api.js";

export { UiSelect } from "../../kit/UiSelect.js";

export type { UiSelectOption } from "../../kit/UiSelect.js";

export type { CanvasFrame } from "../canvas/canvas-frames-model.js";

export {
  ACTION_LABELS,
  LINK_INTERACTION_ACTIONS,
  isFrameAction,
  linkAction,
} from "@design-studio/actions/_core/links";

export type {
  LinkAction,
  LinkTarget,
  PrototypeLink,
} from "@design-studio/actions/_core/links";

export {
  LINK_DELAY_MAX,
  LINK_TRIGGERS,
  LINK_VISIBILITIES,
  TRIGGER_LABELS,
  cleanDelay,
  cleanLinkKey,
  cleanLinkUrl,
  targetFrame,
} from "@design-studio/actions/_core/link-interaction";

export type {
  LinkTrigger,
  LinkTriggerKind,
  LinkVisibility,
} from "@design-studio/actions/_core/link-interaction";

export type { PlayRunOp } from "@design-studio/actions/_core/contracts";
