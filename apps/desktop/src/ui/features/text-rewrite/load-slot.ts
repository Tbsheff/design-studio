import type { ComponentType } from "react";

import type { TextRewriteMenuProps } from "./text-rewrite-menu.js";

interface LoadedSlot {
  readonly default: ComponentType<TextRewriteMenuProps>;
}

const loadTextRewriteSlot = async (): Promise<LoadedSlot> => {
  const loaded = await import("./text-rewrite-slot.js");

  return { default: loaded.TextRewriteSlot };
};

export { loadTextRewriteSlot };
