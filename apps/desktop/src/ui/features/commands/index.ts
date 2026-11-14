import { lazy } from "react";

import type { CommandLayer as CommandLayerView } from "./command-layer.js";
import type { useCanvasCommands as UseCanvasCommands } from "./use-canvas-commands.js";
import type { useStudioCommands as UseStudioCommands } from "./use-studio-commands.js";

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

const loadStudioCommands = async (): Promise<typeof UseStudioCommands> => {
  const loaded = await import("./use-studio-commands.js");

  return loaded.useStudioCommands;
};

const loadCanvasCommands = async (): Promise<typeof UseCanvasCommands> => {
  const loaded = await import("./use-canvas-commands.js");

  return loaded.useCanvasCommands;
};

export {
  CommandLayer,
  CommandRules,
  loadCanvasCommands,
  loadCommandLayer,
  loadStudioCommands,
  moveRegion,
};

export { focusNewProject, runThemeCommand } from "./global-commands.js";

export {
  IS_MAC,
  commandBlocker,
  openLayer,
  runCommand,
  tipWithKey,
  useCommands,
} from "./registry.js";

export type { useStudioCommands } from "./use-studio-commands.js";

export type { Command, CommandLayer as CommandLayerName } from "./registry.js";

export type { OpenTarget as FileOpenTarget } from "./use-file-rows.js";

export type { CanvasInput as CanvasCommandsInput } from "./use-canvas-commands.js";
