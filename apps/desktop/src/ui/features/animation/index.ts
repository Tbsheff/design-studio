import { lazy } from "react";

const AnimationEntry = lazy(async () => {
  const loaded = await import("./animation-entry.js");

  return { default: loaded.AnimationEntry };
});

export { AnimationEntry };
