import type { AttachedApp, Direction } from "@design-studio/contracts";
import type {
  FocusEvent as ReactFocusEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

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

const frameLabelOf = (frameId: string): Element | null =>
  document.querySelector(
    `.frame-label[data-frame-id="${CSS.escape(frameId)}"]`
  );

const jumpToFrame = (frameId: string): void => {
  const id = CSS.escape(frameId);

  const target =
    document.querySelector(`.canvas-frame[data-frame-id="${id}"]`) ??
    frameLabelOf(frameId);

  target?.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  });
};

const shellDirectionName = (shell: CanvasShell | undefined): string | null =>
  shell?.directionName ?? null;

const inEditPane = (shell: CanvasShell | undefined): boolean =>
  shell?.pane === "design";

const hostedClose = (
  shell: CanvasShell | undefined,
  close: () => void
): (() => void) | undefined => (shell ? undefined : close);

const noteCommentFrame = (
  control: CommentsControl | undefined,
  active: { id: string; path?: string; label?: string }
): void => {
  if (control) {
    control.frameRef.current = {
      id: active.id,
      path: active.path ?? "",
      ...(active.label ? { label: active.label } : {}),
    };
  }
};

const activeFrameOf = (
  active: { id: string; path?: string },
  all: { id: string }[]
) => ({ id: active.id, ids: all.map((f) => f.id), path: active.path ?? "" });

const pageNameOf = (path: string | undefined): string => {
  const file = path
    ?.split("/")
    .pop()
    ?.replace(/\.html?$/i, "");

  return file && file !== "index" ? file : "Page";
};

const commentToolsOf = (
  props: Props,
  path: string | undefined
): CommentTools => {
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
};

const RECT_REFRESH_MS = [300, 1200];

const NO_VERSION_TEXT =
  "No completed version yet. Switch to Live to see the current work.";

type StageNote = "building" | "empty" | null;

const stageNote = (p: {
  running?: boolean;
  noRuns?: boolean;
  app?: AttachedApp | null;
  live: boolean;
  hasHead: boolean;
  urlError: string | null;
}): StageNote => {
  if (p.urlError || !p.live || p.hasHead) {
    return null;
  }

  if (p.running) {
    return "building";
  }

  return p.noRuns && !p.app ? "empty" : null;
};

const themeSwitch = (enabled: boolean | undefined, theme: ThemeChoice) => {
  if (!enabled) {
    return;
  }

  const dark = theme === "dark";

  return { dark, onToggle: () => broadcastTheme(dark ? null : "dark") };
};

const livePageUrl = (
  baseUrl: string | null,
  active: CanvasFrame,
  states: FrameStatesRead
): string | null =>
  baseUrl
    ? frameStateUrl(withFramePath(baseUrl, active.path), states, active.id)
    : null;

const knownList = (
  directions: CanvasDirections | undefined
): Direction[] | undefined => directions?.list;

const activateOf = (
  directions: CanvasDirections | undefined
): ((id: string) => void) | undefined => directions?.onActivate;

const knownIds = (
  directions: CanvasDirections | undefined
): string[] | undefined => directions?.list.map((d) => d.id);

const stageCursor = (pz: {
  panning: boolean;
  spaceHeld: boolean;
  zoomHeld: boolean;
}): string => {
  if (pz.panning) {
    return "grabbing";
  }

  if (pz.spaceHeld) {
    return "grab";
  }

  return pz.zoomHeld ? "zoom-in" : "";
};

const quietOnPointer =
  (
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  ): ((e: ReactPointerEvent<HTMLDivElement>) => void) =>
  (e: ReactPointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setAttribute(QUIET_FOCUS_ATTR, "");
    onPointerDown(e);
  };

const dropQuietFocus = (e: ReactFocusEvent<HTMLDivElement>): void => {
  if (e.target === e.currentTarget) {
    e.currentTarget.removeAttribute(QUIET_FOCUS_ATTR);
  }
};

const canvasClass = (editing: boolean): string =>
  editing ? "canvas text-editing" : "canvas";

const marqueeAllowed = (
  picking: boolean,
  prototype: boolean,
  comment: boolean
): boolean => picking && !prototype && !comment;

const overlayHover = <T extends { fromTree?: boolean }>(
  hover: T | null,
  picking: boolean
): T | null => (picking || hover?.fromTree ? hover : null);

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
