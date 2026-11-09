import { heldTool } from "../../platform/canvas-tool.js";
import type { HeldTool } from "../../platform/canvas-tool.js";
import type { ChromeProps } from "./canvas-chrome-menu.js";
import type { CanvasShell, TopBarHosts } from "./canvas-shell.js";
import type { CanvasTool, PresentMode } from "./top-bar-menu-model.js";
import { vectorTool } from "./vector-tool-model.js";
import type { VectorToolId } from "./vector-tool-model.js";

interface BarShell {
  readonly canExport: boolean;
  readonly directionName: string | null;
  readonly onExport: () => void;
  readonly onShareLink: ((mode?: "link" | "publish") => void) | null;
  readonly onShip: (() => void) | null;
  readonly topBar: TopBarHosts | null;
}

const noop = (): null => null;

const toBarShell = (shell: CanvasShell | undefined): BarShell => {
  if (!shell) {
    return {
      canExport: false,
      directionName: null,
      onExport: noop,
      onShareLink: null,
      onShip: null,
      topBar: null,
    };
  }

  return {
    canExport: shell.canExport,
    directionName: shell.directionName,
    onExport: shell.onExport,
    onShareLink: shell.onShareLink ?? null,
    onShip: shell.onShip ?? null,
    topBar: shell.topBar,
  };
};

const isViewOpen = (chrome: ChromeProps): boolean =>
  chrome.ui.viewRowOpen || chrome.view.source.kind === "version";

const clearTools = (chrome: ChromeProps): void => {
  chrome.proto.set(false);
  chrome.comment.setOn(false);
  vectorTool.set(null);
  heldTool.set(null);
};

const runVectorTool = (chrome: ChromeProps, tool: VectorToolId): void => {
  const isOn = vectorTool.get().tool === tool;

  clearTools(chrome);

  if (!isOn) {
    vectorTool.set(tool);
  }
};

const runHeldTool = (chrome: ChromeProps, tool: HeldTool): void => {
  const isOn = heldTool.get() === tool;

  clearTools(chrome);
  chrome.setSelectMode(() => true);

  if (!isOn) {
    heldTool.set(tool);
  }
};

const runPrototypeTool = (chrome: ChromeProps): void => {
  const isOn = chrome.proto.on;

  clearTools(chrome);
  chrome.proto.set(!isOn);
};

const runCommentTool = (chrome: ChromeProps): void => {
  chrome.proto.set(false);
  vectorTool.set(null);
  heldTool.set(null);
  chrome.comment.toggle();
};

const runSelectTool = (chrome: ChromeProps): void => {
  clearTools(chrome);
  chrome.setSelectMode(() => true);
};

const runTool = (
  chrome: ChromeProps,
  next: Exclude<CanvasTool, null>
): void => {
  switch (next) {
    case "prototype": {
      runPrototypeTool(chrome);

      return;
    }

    case "comment": {
      runCommentTool(chrome);

      return;
    }

    case "shape": {
      runVectorTool(chrome, "rect");

      return;
    }

    case "pen": {
      runVectorTool(chrome, "pen");

      return;
    }

    case "hand":
    case "frame":
    case "text": {
      runHeldTool(chrome, next);

      return;
    }

    default: {
      runSelectTool(chrome);
    }
  }
};

type InlinePresent = Exclude<PresentMode, "new-window" | "play">;

export { isViewOpen, runTool, toBarShell };

export type { BarShell, CanvasTool, InlinePresent, PresentMode };
