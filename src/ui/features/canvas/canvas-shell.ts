import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import type {
  ProjectKind,
  SelectionContext,
} from "../../../shared/contracts.js";
import type { CanvasTool } from "../../components/CanvasTopBar.js";
import { uiStore } from "../../storage.js";
import type { PanelTab } from "../../usePanelTab.js";
import type { CanvasFrame } from "./canvas-frames-model.js";

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

type CommentTool = {
  available: boolean;
  on: boolean;
  setOn: (on: boolean) => void;
  toggle: () => void;
};

function useShellState(
  shell: CanvasShell | undefined,
  comment: CommentTool,
  setSelectMode: SetSelectMode
) {
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
}

function useShellPane(
  shell: CanvasShell | undefined,
  comment: CommentTool,
  selectMode: boolean,
  setSelectMode: SetSelectMode,
  live: boolean,
  layersOpenSetting: boolean
) {
  useShellState(shell, comment, setSelectMode);
  const picking = selectMode || (shell?.pane === "design" && !comment.on);
  const editOpen = shell ? shell.pane === "design" : layersOpenSetting;
  const hostReady = !shell || shell.layersHost !== null;
  const layersOpen = editOpen && live && hostReady;

  const toggleEdit = () =>
    shell?.onPane(shell.pane === "design" ? "chat" : "design");

  const closeLayers = () =>
    shell ? shell.onPane("chat") : uiStore.set({ layersOpen: false });

  const place = (panel: ReactNode) =>
    shell?.layersHost ? createPortal(panel, shell.layersHost) : panel;

  return { layersOpen, picking, toggleEdit, closeLayers, place };
}

function fileNameOf(
  frame: CanvasFrame,
  kind: ProjectKind,
  directionName: string | null
): string {
  if (kind === "html") {
    return (
      (frame.path || "index.html")
        .replace(/\.html$/, "")
        .replace(/^.*\//, "") || "index"
    );
  }

  return directionName ?? "Design";
}

function toolOf(
  pane: PanelTab | undefined,
  comment: boolean,
  select: boolean,
  proto: boolean
): CanvasTool {
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
}

function reloadFrames(stage: HTMLElement | null) {
  stage?.querySelectorAll<HTMLIFrameElement>("iframe.frame").forEach((el) => {
    const src = el.src;

    if (src) {
      el.src = src;
    }
  });
}

function scopeOf(selection: SelectionContext[]): string | null {
  if (selection.length > 1) {
    return `${selection.length} elements`;
  }

  const first = selection[0];

  return first ? `the ${first.tag}` : null;
}

export { fileNameOf, reloadFrames, scopeOf, toolOf, useShellPane };

export type { CanvasShell, CommentTool, SetSelectMode };
