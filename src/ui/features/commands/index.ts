import { lazy } from "react";

const CommandLayer = lazy(async () => {
  const loaded = await import("./command-layer.js");

  return { default: loaded.CommandLayer };
});

const CommandRules = lazy(async () => {
  const loaded = await import("./command-rules.js");

  return { default: loaded.CommandRules };
});

export { CommandLayer, CommandRules };
