import type { ProjectKind, SelectionContext } from "@design-studio/contracts";
import { useEffect, useEffectEvent, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { uiStore } from "../../platform/storage.js";
import type { PanelTab } from "../../platform/use-panel-tab.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasTool } from "./top-bar-menu.js";

interface CanvasShell {
  pane: PanelTab;
  onPane: (tab: PanelTab) => Promise<boolean>;
  layersHost: HTMLElement | null;
  directionName: string | null;
  paneCollapsed: boolean;
  onExpandPane: () => void;
  canExport: boolean;
  onExport: () => void;
  onTweak: ((prompt: string) => void) | null;
  onShip?: (() => void) | null;
  onShareLink?: ((mode?: "link" | "publish") => void) | null;
  onAskAgent?: (text: string) => void;
}

type SetSelectMode = (update: (match: boolean) => boolean) => void;

interface CommentTool {
  available: boolean;
  on: boolean;
  setOn: (on: boolean) => void;
  toggle: () => void;
}

const useShellState = (
  shell: CanvasShell | undefined,
  comment: CommentTool,
  setSelectMode: SetSelectMode
): void => {
  const pane = shell?.pane;
  const wasOn = useRef(comment.on);

  const openPane = useEffectEvent(async (): Promise<void> => {
    const moved = await shell?.onPane("comments");

    if (moved === false) {
      comment.setOn(false);
    }
  });

  const closeComment = useEffectEvent((): void => {
    if (comment.on) {
      comment.setOn(false);
    }
  });

  useEffect(() => {
    const before = wasOn.current;
    wasOn.current = comment.on;

    if (!comment.on || before) {
      return;
    }

    openPane();
  }, [comment.on]);

  const prevPane = useRef(pane);
  useEffect(() => {
    const before = prevPane.current;
    prevPane.current = pane;

    if (before === pane) {
      return;
    }

    if (pane !== "comments") {
      closeComment();
    }

    if (before === "design") {
      setSelectMode(() => false);
    }
  }, [pane, setSelectMode]);
};

const useShellPane = (
  shell: CanvasShell | undefined,
  comment: CommentTool,
  selectMode: boolean,
  setSelectMode: SetSelectMode,
  live: boolean,
  layersOpenSetting: boolean
): {
  closeLayers: () => void;
  layersOpen: boolean;
  picking: boolean;
  place: (panel: ReactNode) => ReactNode;
  toggleEdit: () => void;
} => {
  useShellState(shell, comment, setSelectMode);
  const picking = selectMode || (shell?.pane === "design" && !comment.on);

  let editOpen: boolean = layersOpenSetting;

  if (shell) {
    editOpen = shell.pane === "design";
  }

  const hostReady = !shell || shell.layersHost !== null;
  const layersOpen = editOpen && live && hostReady;

  const toggleEdit = (): void => {
    if (!shell) {
      return;
    }

    if (shell.pane === "design") {
      shell.onPane("chat");
    } else {
      shell.onPane("design");
    }
  };

  const closeLayers = (): void => {
    if (shell) {
      shell.onPane("chat");

      return;
    }

    uiStore.set({ layersOpen: false });
  };

  const place = (panel: ReactNode): ReactNode => {
    if (shell?.layersHost) {
      return createPortal(panel, shell.layersHost);
    }

    return panel;
  };

  return { closeLayers, layersOpen, picking, place, toggleEdit };
};

const fileNameOf = (
  frame: CanvasFrame,
  kind: ProjectKind,
  directionName: string | null
): string => {
  if (kind === "html") {
    return (
      (frame.path || "index.html")
        .replace(/\.html$/u, "")
        .replace(/^.*\//u, "") || "index"
    );
  }

  return directionName ?? "Design";
};

const toolOf = (
  pane: PanelTab | undefined,
  comment: boolean,
  select: boolean,
  proto: boolean
): CanvasTool => {
  if (proto) {
    return "prototype";
  }

  if (comment) {
    return "comment";
  }

  if (pane === "design") {
    return "edit";
  }

  if (select) {
    return "select";
  }

  return null;
};

const reloadFrames = (stage: HTMLElement | null): void => {
  const frames = stage?.querySelectorAll<HTMLIFrameElement>("iframe.frame");

  for (const el of frames ?? []) {
    const { src } = el;

    if (src) {
      el.src = src;
    }
  }
};

const scopeOf = (selection: SelectionContext[]): string | null => {
  if (selection.length > 1) {
    return `${selection.length} elements`;
  }

  const [first] = selection;

  if (first) {
    return `the ${first.tag}`;
  }

  return null;
};

export { fileNameOf, reloadFrames, scopeOf, toolOf, useShellPane };

export type { CanvasShell, CommentTool, SetSelectMode };
