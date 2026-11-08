import { lazy } from "react";

const MarkupOverlay = lazy(async () => {
  const loaded = await import("./markup-overlay.js");

  return { default: loaded.MarkupOverlay };
});

export { MarkupOverlay };

export { useMarkupCommand } from "./use-markup-command.js";

export type { MarkupOverlayProps, MarkupRect } from "./markup-overlay.js";

export type { MarkupTarget } from "./use-markup-send.js";
