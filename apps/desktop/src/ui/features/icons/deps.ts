export { api } from "../../api.js";

export type { IconInsertBody, IconInsertReply } from "../../api.js";

export { useCommands } from "../commands/registry.js";

export type { Command } from "../commands/registry.js";

export { IS_MAC } from "../commands/keys.js";

export type { PreviewMenuItem } from "../canvas/preview-menu.js";

export { insertError } from "../design-system/component-insert-api.js";

export { isTypingTarget } from "../../platform/typing-target.js";

export { useModalDialog } from "@design-studio/ui";

export type { SelectionContext } from "@design-studio/contracts";

export {
  ICON_COLOR,
  ICON_SIZE_DEFAULT,
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
} from "@design-studio/contracts/icons";

export type {
  IconList,
  IconPosition,
  IconSummary,
} from "@design-studio/contracts/icons";

export type { InsertTarget } from "@design-studio/contracts/insert";

export { matchesKey } from "../../../shared/keymap.js";
