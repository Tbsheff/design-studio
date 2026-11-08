import type { ProjectKind, SelectionContext } from "@design-studio/contracts";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { uiStore } from "../../platform/storage.js";
import type { PanelTab } from "../../platform/use-panel-tab.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasTool } from "./top-bar-menu.js";

interface CanvasShell {
  pane: PanelTab;
  onPane: (tab: PanelTab) => void | Promise<boolean>;
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

type SetSelectMode = (update: (m: boolean) => boolean) => void;

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
  const onPane = useRef(shell?.onPane);
  onPane.current = shell?.onPane;
  const pane = shell?.pane;
  const commentRef = useRef(comment);
  commentRef.current = comment;
  const wasOn = useRef(comment.on);
  useEffect(() => {
    const before = wasOn.current;
    wasOn.current = comment.on;

    if (!comment.on || before) {
      return;
    }

    void Promise.resolve(onPane.current?.("comments")).then((moved) => {
      if (moved === false) {
        commentRef.current.setOn(false);
      }
    });
  }, [comment.on]);
  const prevPane = useRef(pane);
  useEffect(() => {
    const before = prevPane.current;
    prevPane.current = pane;

    if (before === pane) {
      return;
    }

    if (pane !== "comments" && commentRef.current.on) {
      commentRef.current.setOn(false);
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
) => {
  useShellState(shell, comment, setSelectMode);
  const picking = selectMode || (shell?.pane === "design" && !comment.on);
  const editOpen = shell ? shell.pane === "design" : layersOpenSetting;
  const hostReady = !shell || shell.layersHost !== null;
  const layersOpen = editOpen && live && hostReady;

  const toggleEdit = (): void | Promise<boolean> | undefined =>
    shell?.onPane(shell.pane === "design" ? "chat" : "design");

  const closeLayers = (): void | Promise<boolean> =>
    shell ? shell.onPane("chat") : uiStore.set({ layersOpen: false });

  const place = (panel: ReactNode): ReactNode =>
    shell?.layersHost ? createPortal(panel, shell.layersHost) : panel;

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
        .replace(/\.html$/, "")
        .replace(/^.*\//, "") || "index"
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

  return select ? "select" : null;
};

const reloadFrames = (stage: HTMLElement | null): void => {
  stage?.querySelectorAll<HTMLIFrameElement>("iframe.frame").forEach((el) => {
    const { src } = el;

    if (src) {
      el.src = src;
    }
  });
};

const scopeOf = (selection: SelectionContext[]): string | null => {
  if (selection.length > 1) {
    return `${selection.length} elements`;
  }

  const first = selection[0];

  return first ? `the ${first.tag}` : null;
};

export { fileNameOf, reloadFrames, scopeOf, toolOf, useShellPane };

export type { CanvasShell, CommentTool, SetSelectMode };
