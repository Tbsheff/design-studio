import { lazy } from "react";

const TextRewriteSlot = lazy(async () => {
  const loaded = await import("./text-rewrite-slot.js");

  return { default: loaded.TextRewriteSlot };
});

export { TextRewriteSlot };

export type { TextRewriteMenuProps } from "./text-rewrite-menu.js";
