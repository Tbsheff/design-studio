import { lazy } from "react";

const DevNotePanel = lazy(async () => {
  const loaded = await import("./dev-note-panel.js");

  return { default: loaded.DevNotePanel };
});

export { DevNotePanel };
