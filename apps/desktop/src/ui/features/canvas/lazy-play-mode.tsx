import { lazy } from "react";

const PlayMode = lazy(async () => {
  const loaded = await import("./play-mode.js");

  return { default: loaded.PlayMode };
});

export { PlayMode };
