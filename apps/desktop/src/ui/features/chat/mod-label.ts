import { IS_MAC } from "../../chat-slots.js";

const toModLabel = (isMac: boolean): string => {
  if (isMac) {
    return "⌘";
  }

  return "Ctrl+";
};

const MOD_LABEL = toModLabel(IS_MAC);

export { MOD_LABEL, toModLabel };
