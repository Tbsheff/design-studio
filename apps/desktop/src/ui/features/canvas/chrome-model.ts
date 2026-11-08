import type { ChromeProps } from "./canvas-chrome-menu.js";
import type { CanvasShell } from "./canvas-shell.js";
import type { CanvasTool, PresentMode } from "./top-bar-menu-model.js";

interface BarShell {
  readonly canExport: boolean;
  readonly directionName: string | null;
  readonly onExpandPane: () => void;
  readonly onExport: () => void;
  readonly onShareLink: ((mode?: "link" | "publish") => void) | null;
  readonly onShip: (() => void) | null;
  readonly paneCollapsed: boolean;
}

const noop = (): null => null;

const toBarShell = (shell: CanvasShell | undefined): BarShell => {
  if (!shell) {
    return {
      canExport: false,
      directionName: null,
      onExpandPane: noop,
      onExport: noop,
      onShareLink: null,
      onShip: null,
      paneCollapsed: false,
    };
  }

  return {
    canExport: shell.canExport,
    directionName: shell.directionName,
    onExpandPane: shell.onExpandPane,
    onExport: shell.onExport,
    onShareLink: shell.onShareLink ?? null,
    onShip: shell.onShip ?? null,
    paneCollapsed: shell.paneCollapsed,
  };
};

const isViewOpen = (chrome: ChromeProps): boolean =>
  chrome.ui.viewRowOpen || chrome.view.source.kind === "version";

const runEditTool = (chrome: ChromeProps, leavingProto: boolean): void => {
  const { shell } = chrome;

  if (leavingProto && shell?.pane === "design") {
    return;
  }

  chrome.toggleEdit();
};

const runSelectTool = (chrome: ChromeProps): void => {
  const { shell } = chrome;
  const editing = shell?.pane === "design";

  chrome.comment.setOn(false);

  if (editing) {
    shell?.onPane("chat");
  }

  chrome.setSelectMode(() => true);
};

const runTool = (
  chrome: ChromeProps,
  next: Exclude<CanvasTool, null>
): void => {
  if (next === "prototype") {
    chrome.proto.set(!chrome.proto.on);

    return;
  }

  const leavingProto = chrome.proto.on;

  chrome.proto.set(false);

  if (next === "comment") {
    chrome.comment.toggle();
  } else if (next === "edit") {
    runEditTool(chrome, leavingProto);
  } else {
    runSelectTool(chrome);
  }
};

type InlinePresent = Exclude<PresentMode, "new-window" | "play">;

export { isViewOpen, runTool, toBarShell };

export type { BarShell, CanvasTool, InlinePresent, PresentMode };
