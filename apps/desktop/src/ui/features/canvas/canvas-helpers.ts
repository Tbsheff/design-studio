import type {
  FocusEvent as ReactFocusEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import type { AttachedApp, Direction } from "../../../shared/actions/_core/contracts.js";
import type { CommentTools } from "../comments/comment-layer.js";
import type { CommentsControl } from "../comments/use-comments.js";
import { broadcastTheme } from "../design-system/token-frames.js";
import type { ThemeChoice } from "../design-system/token-frames.js";
import { withFramePath } from "./canvas-frames-model.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasShell } from "./canvas-shell.js";
import type { CanvasDirections, Props } from "./canvas-types.js";
import { frameStateUrl } from "./frame-states-model.js";
import type { FrameStatesRead } from "./frame-states-model.js";
import { QUIET_FOCUS_ATTR } from "./use-inline-text-edit.js";

function frameLabelOf(frameId: string): Element | null {
  return document.querySelector(
    `.frame-label[data-frame-id="${CSS.escape(frameId)}"]`
  );
}

function jumpToFrame(frameId: string): void {
  const id = CSS.escape(frameId);

  const target =
    document.querySelector(`.canvas-frame[data-frame-id="${id}"]`) ??
    frameLabelOf(frameId);

  target?.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  });
}

function shellDirectionName(shell: CanvasShell | undefined): string | null {
  return shell?.directionName ?? null;
}

function inEditPane(shell: CanvasShell | undefined): boolean {
  return shell?.pane === "design";
}

function hostedClose(
  shell: CanvasShell | undefined,
  close: () => void
): (() => void) | undefined {
  return shell ? undefined : close;
}

function noteCommentFrame(
  control: CommentsControl | undefined,
  active: { id: string; path?: string; label?: string }
): void {
  if (control) {
    control.frameRef.current = {
      id: active.id,
      path: active.path ?? "",
      ...(active.label ? { label: active.label } : {}),
    };
  }
}

function activeFrameOf(
  active: { id: string; path?: string },
  all: { id: string }[]
) {
  return { id: active.id, ids: all.map((f) => f.id), path: active.path ?? "" };
}

function pageNameOf(path: string | undefined): string {
  const file = path
    ?.split("/")
    .pop()
    ?.replace(/\.html?$/i, "");

  return file && file !== "index" ? file : "Page";
}

function commentToolsOf(props: Props, path: string | undefined): CommentTools {
  const tools = props.commentTools ?? {};

  return {
    onSteer: tools.onSteer,
    pageName: pageNameOf(path),
    sources: {
      components: tools.components,
      directionId: props.directionId,
      projectId: props.projectId,
      tokens: tools.tokens,
    },
  };
}

const RECT_REFRESH_MS = [300, 1200];

const NO_VERSION_TEXT =
  "No completed version yet. Switch to Live to see the current work.";

type StageNote = "building" | "empty" | null;

function stageNote(p: {
  running?: boolean;
  noRuns?: boolean;
  app?: AttachedApp | null;
  live: boolean;
  hasHead: boolean;
  urlError: string | null;
}): StageNote {
  if (p.urlError || !p.live || p.hasHead) {
    return null;
  }

  if (p.running) {
    return "building";
  }

  return p.noRuns && !p.app ? "empty" : null;
}

function themeSwitch(enabled: boolean | undefined, theme: ThemeChoice) {
  if (!enabled) {
    return;
  }

  const dark = theme === "dark";

  return { dark, onToggle: () => broadcastTheme(dark ? null : "dark") };
}

function livePageUrl(
  baseUrl: string | null,
  active: CanvasFrame,
  states: FrameStatesRead
): string | null {
  return baseUrl
    ? frameStateUrl(withFramePath(baseUrl, active.path), states, active.id)
    : null;
}

function knownList(
  directions: CanvasDirections | undefined
): Direction[] | undefined {
  return directions?.list;
}

function activateOf(
  directions: CanvasDirections | undefined
): ((id: string) => void) | undefined {
  return directions?.onActivate;
}

function knownIds(
  directions: CanvasDirections | undefined
): string[] | undefined {
  return directions?.list.map((d) => d.id);
}

function stageCursor(pz: {
  panning: boolean;
  spaceHeld: boolean;
  zoomHeld: boolean;
}): string {
  if (pz.panning) {
    return "grabbing";
  }

  if (pz.spaceHeld) {
    return "grab";
  }

  return pz.zoomHeld ? "zoom-in" : "";
}

function quietOnPointer(
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
) {
  return (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setAttribute(QUIET_FOCUS_ATTR, "");
    onPointerDown(e);
  };
}

function dropQuietFocus(e: ReactFocusEvent<HTMLDivElement>): void {
  if (e.target === e.currentTarget) {
    e.currentTarget.removeAttribute(QUIET_FOCUS_ATTR);
  }
}

function canvasClass(editing: boolean): string {
  return editing ? "canvas text-editing" : "canvas";
}

function marqueeAllowed(
  picking: boolean,
  prototype: boolean,
  comment: boolean
): boolean {
  return picking && !prototype && !comment;
}

function overlayHover<T extends { fromTree?: boolean }>(
  hover: T | null,
  picking: boolean
): T | null {
  return picking || hover?.fromTree ? hover : null;
}

export {
  NO_VERSION_TEXT,
  RECT_REFRESH_MS,
  activateOf,
  activeFrameOf,
  canvasClass,
  commentToolsOf,
  dropQuietFocus,
  frameLabelOf,
  hostedClose,
  inEditPane,
  jumpToFrame,
  knownIds,
  knownList,
  livePageUrl,
  marqueeAllowed,
  noteCommentFrame,
  overlayHover,
  quietOnPointer,
  shellDirectionName,
  stageCursor,
  stageNote,
  themeSwitch,
};

export type { StageNote };
