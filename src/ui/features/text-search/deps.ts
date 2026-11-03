export { api } from "../../api.js";

export type { CanvasFrame } from "../../canvasFrames.js";

export { FIND_TEXT_COMMAND, FIND_TEXT_EVENT } from "../../domain/find-text.js";

export { IS_MAC } from "../../commands/keys.js";

export { isTypingTarget } from "../../platform/typing-target.js";

export { matchesKey, shortcutLabel } from "../../../shared/keymap.js";

export type {
  TextHit,
  TextSearchQuery,
  TextSearchResult,
  TextUpdateResult,
} from "../../../shared/text-search.js";
