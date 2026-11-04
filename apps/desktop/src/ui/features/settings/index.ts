import { lazy } from "react";

const KeysPanel = lazy(async () => {
  const loaded = await import("./keys-panel.js");

  return { default: loaded.KeysPanel };
});

export { KeysPanel };
