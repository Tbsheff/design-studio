import type { AttachedApp, Direction } from "@design-studio/contracts";
import type {
  FocusEvent as ReactFocusEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import type { CommentTools } from "../comments/comment-layer.js";
import type { CommentsControl } from "../comments/use-comments.js";
import { broadcastTheme } from "../design-system/token-frames.js";
import type { ThemeChoice } from "../design-system/token-frames.js";
import { withFramePath } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasShell } from "./canvas-shell.js";
import type { CanvasDirections, Props } from "./canvas-types.js";
import { frameStateUrl } from "./frame-states-model.js";
import type { FrameStatesRead } from "./frame-states-model.js";
import { QUIET_FOCUS_ATTR } from "./use-inline-text-edit.js";

const ITEM_300 = 300;

const ITEM_1200 = 1200;

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
): (() => void) | undefined => {
  if (shell) {
    return undefined;
  }

  return close;
};

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
): { id: string; ids: string[]; path: string } => ({
  id: active.id,
  ids: all.map((frame) => frame.id),
  path: active.path ?? "",
});

const pageNameOf = (path: string | undefined): string => {
  const file = path
    ?.split("/")
    .pop()
    ?.replace(/\.html?$/iu, "");

  if (file && file !== "index") {
    return file;
  }

  return "Page";
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

const RECT_REFRESH_MS = [ITEM_300, ITEM_1200];

const NO_VERSION_TEXT =
  "No completed version yet. Switch to Live to see the current work.";

type StageNote = "building" | "empty" | null;

const stageNote = (point: {
  running?: boolean;
  noRuns?: boolean;
  app?: AttachedApp | null;
  live: boolean;
  hasHead: boolean;
  urlError: string | null;
}): StageNote => {
  if (point.urlError || !point.live || point.hasHead) {
    return null;
  }

  if (point.running) {
    return "building";
  }

  if (point.noRuns && !point.app) {
    return "empty";
  }

  return null;
};

const themeSwitch = (
  enabled: boolean | undefined,
  theme: ThemeChoice
): { dark: boolean; onToggle: () => void } | undefined => {
  if (!enabled) {
    return;
  }

  const dark = theme === "dark";

  return {
    dark,
    onToggle: () => {
      let argument: "dark" | null = "dark";

      if (dark) {
        argument = null;
      }

      return broadcastTheme(argument);
    },
  };
};

const livePageUrl = (
  baseUrl: string | null,
  active: CanvasFrame,
  states: FrameStatesRead
): string | null => {
  if (baseUrl) {
    return frameStateUrl(
      withFramePath(baseUrl, active.path),
      states,
      active.id
    );
  }

  return null;
};

const knownList = (
  directions: CanvasDirections | undefined
): Direction[] | undefined => directions?.list;

const activateOf = (
  directions: CanvasDirections | undefined
): ((id: string) => void) | undefined => directions?.onActivate;

const knownIds = (
  directions: CanvasDirections | undefined
): string[] | undefined => directions?.list.map((direction) => direction.id);

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

  if (pz.zoomHeld) {
    return "zoom-in";
  }

  return "";
};

const quietOnPointer =
  (
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  ): ((eventValue: ReactPointerEvent<HTMLDivElement>) => void) =>
  (event3: ReactPointerEvent<HTMLDivElement>): void => {
    event3.currentTarget.setAttribute(QUIET_FOCUS_ATTR, "");
    onPointerDown(event3);
  };

const dropQuietFocus = (event4: ReactFocusEvent<HTMLDivElement>): void => {
  if (event4.target === event4.currentTarget) {
    event4.currentTarget.removeAttribute(QUIET_FOCUS_ATTR);
  }
};

const canvasClass = (editing: boolean): string => {
  if (editing) {
    return "canvas text-editing";
  }

  return "canvas";
};

const marqueeAllowed = (
  picking: boolean,
  prototype: boolean,
  comment: boolean
): boolean => picking && !prototype && !comment;

const overlayHover = <Item extends { fromTree?: boolean }>(
  hover: Item | null,
  picking: boolean
): Item | null => {
  if (picking || hover?.fromTree) {
    return hover;
  }

  return null;
};

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
