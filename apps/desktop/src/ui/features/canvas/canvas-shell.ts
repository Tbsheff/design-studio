import type { ProjectKind, SelectionContext } from "@design-studio/contracts";
import { useEffect, useEffectEvent, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import type { HeldTool } from "../../platform/canvas-tool.js";
import { reloadFramesMatching } from "../../platform/stage-dom.js";
import { uiStore } from "../../platform/storage.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasTool } from "./top-bar-menu-model.js";
import type { VectorToolId } from "./vector-tool-model.js";

interface SpeedScope {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly isLive: boolean;
  readonly projectId: string;
}

interface TopBarHosts {
  readonly end: HTMLElement;
  readonly start: HTMLElement;
  readonly tools: HTMLElement;
  readonly zoom: HTMLElement;
}

interface CanvasShell {
  isCommentsShown: boolean;
  isInspectorOpen: boolean;
  isLayersOpen: boolean;
  onCloseLayers: () => void;
  onComments: (isShown: boolean) => Promise<boolean>;
  onInspector: () => Promise<boolean>;
  onLayers: () => void;
  layersHost: HTMLElement | null;
  pagesHost: HTMLElement | null;
  topBar: TopBarHosts | null;
  directionName: string | null;
  canExport: boolean;
  onExport: () => void;
  onShip?: (() => void) | null;
  onShareLink?: ((mode?: "link" | "publish") => void) | null;
  onAskAgent?: (text: string) => void;
  renderSpeed?: ((scope: SpeedScope) => ReactNode) | null;
}

type SetSelectMode = (update: (match: boolean) => boolean) => void;

interface CommentTool {
  available: boolean;
  on: boolean;
  setOn: (on: boolean) => void;
  toggle: () => void;
}

const useCommentMirror = (
  shell: CanvasShell | undefined,
  comment: CommentTool
): void => {
  const wasOn = useRef(comment.on);

  const showComments = useEffectEvent(async (): Promise<void> => {
    const moved = await shell?.onComments(true);

    if (moved === false) {
      comment.setOn(false);
    }
  });

  const hideComments = useEffectEvent((): void => {
    void shell?.onComments(false);
  });

  useEffect(() => {
    const before = wasOn.current;
    wasOn.current = comment.on;

    if (comment.on && !before) {
      void showComments();
    }

    if (!comment.on && before) {
      hideComments();
    }
  }, [comment.on]);
};

const useShellState = (
  shell: CanvasShell | undefined,
  comment: CommentTool
): void => {
  const isShown = shell?.isCommentsShown ?? false;

  const closeComment = useEffectEvent((): void => {
    if (comment.on) {
      comment.setOn(false);
    }
  });

  const prevShown = useRef(isShown);
  useEffect(() => {
    const before = prevShown.current;
    prevShown.current = isShown;

    if (before && !isShown) {
      closeComment();
    }
  }, [isShown]);

  useCommentMirror(shell, comment);
};

interface ShellPaneInput {
  readonly isPlacing: boolean;
  readonly layersOpenSetting: boolean;
  readonly live: boolean;
  readonly selectMode: boolean;
}

interface ShellPane {
  readonly closeLayers: () => void;
  readonly layersOpen: boolean;
  readonly picking: boolean;
  readonly place: (panel: ReactNode) => ReactNode;
  readonly toggleEdit: () => void;
}

const useShellPane = (
  shell: CanvasShell | undefined,
  comment: CommentTool,
  input: ShellPaneInput
): ShellPane => {
  const { isPlacing, layersOpenSetting, live, selectMode } = input;

  useShellState(shell, comment);
  const picking = selectMode || isPlacing;

  let editOpen: boolean = layersOpenSetting;

  if (shell) {
    editOpen = shell.isLayersOpen;
  }

  const hostReady = !shell || shell.layersHost !== null;
  const layersOpen = editOpen && live && hostReady;

  const toggleEdit = (): void => {
    if (shell) {
      shell.onLayers();

      return;
    }

    uiStore.set((prev) => ({ layersOpen: !prev.layersOpen }));
  };

  const closeLayers = (): void => {
    if (shell) {
      shell.onCloseLayers();

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

interface ToolState {
  readonly comment: boolean;
  readonly held: HeldTool | null;
  readonly proto: boolean;
  readonly vector: VectorToolId | null;
}

const toVectorTool = (vector: VectorToolId): CanvasTool => {
  if (vector === "pen") {
    return "pen";
  }

  return "shape";
};

const toolOf = (state: ToolState): CanvasTool => {
  if (state.proto) {
    return "prototype";
  }

  if (state.comment) {
    return "comment";
  }

  if (state.vector) {
    return toVectorTool(state.vector);
  }

  return state.held ?? "select";
};

const reloadFrames = (stage: HTMLElement | null): void => {
  if (stage) {
    reloadFramesMatching("iframe.frame", stage);
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

export type {
  CanvasShell,
  CommentTool,
  SetSelectMode,
  ShellPane,
  ShellPaneInput,
  SpeedScope,
  ToolState,
  TopBarHosts,
};
