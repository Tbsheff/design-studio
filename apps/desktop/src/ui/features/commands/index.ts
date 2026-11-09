import { lazy } from "react";

import type { CommandLayer as CommandLayerView } from "./command-layer.js";

const loadCommandLayer = async (): Promise<typeof CommandLayerView> => {
  const loaded = await import("./command-layer.js");

  return loaded.CommandLayer;
};

const CommandLayer = lazy(async () => ({ default: await loadCommandLayer() }));

const CommandRules = lazy(async () => {
  const loaded = await import("./command-rules.js");

  return { default: loaded.CommandRules };
});

const moveRegion = async (step: 1 | -1): Promise<void> => {
  const loaded = await import("./use-studio-commands.js");

  loaded.moveRegion(step);
};

export { CommandLayer, CommandRules, loadCommandLayer, moveRegion };

export { focusNewProject, runThemeCommand } from "./global-commands.js";

export {
  IS_MAC,
  commandBlocker,
  openLayer,
  runCommand,
  tipWithKey,
  useCommands,
} from "./registry.js";

export { useStudioCommands } from "./use-studio-commands.js";

export type { Command, CommandLayer as CommandLayerName } from "./registry.js";

export { useCanvasCommands } from "./use-canvas-commands.js";

export type { CanvasInput as CanvasCommandsInput } from "./use-canvas-commands.js";
