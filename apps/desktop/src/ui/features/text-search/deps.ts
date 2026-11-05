export { api } from "../../api.js";

export type { CanvasFrame } from "../canvas/canvas-frames-model.js";

export { FIND_TEXT_COMMAND, FIND_TEXT_EVENT } from "../../domain/find-text.js";

export { IS_MAC } from "../commands/keys.js";

export { isTypingTarget } from "../../platform/typing-target.js";

export { matchesKey, shortcutLabel } from "../../../shared/keymap.js";

export type {
  TextHit,
  TextSearchQuery,
  TextSearchResult,
  TextUpdateResult,
} from "@design-studio/contracts/text-search";
