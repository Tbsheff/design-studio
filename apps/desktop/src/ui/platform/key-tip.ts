import { shortcutLabel } from "../../shared/keymap.js";
import type { KeyId } from "../../shared/keymap.js";
import { isMacPlatform } from "./mac.js";

const IS_MAC = isMacPlatform();

const tipWithKey = (label: string, id: KeyId): string =>
  `${label}  ${shortcutLabel(id, IS_MAC)}`;

export { tipWithKey };
