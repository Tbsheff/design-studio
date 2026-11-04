export { api } from "../../api.js";

export type { IconInsertBody, IconInsertReply } from "../../api.js";

export { useCommands } from "../commands/registry.js";

export type { Command } from "../commands/registry.js";

export { IS_MAC } from "../commands/keys.js";

export type { PreviewMenuItem } from "../canvas/preview-menu.js";

export { insertError } from "../design-system/component-insert-api.js";

export { isTypingTarget } from "../../platform/typing-target.js";

export { useModalDialog } from "../../kit/use-popover.js";

export type { SelectionContext } from "../../../shared/actions/_core/contracts.js";

export {
  ICON_COLOR,
  ICON_SIZE_DEFAULT,
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
} from "../../../shared/icons.js";

export type {
  IconList,
  IconPosition,
  IconSummary,
} from "../../../shared/icons.js";

export type { InsertTarget } from "../../../shared/actions/_core/insert.js";

export { matchesKey } from "../../../shared/keymap.js";
