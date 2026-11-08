import { frameName } from "./canvas-frame-ops.js";
import { canvasStore } from "./canvas-frames-model.js";
import type { CanvasFrame } from "./canvas-frames-model.js";

interface FrameBadge {
  label: string;
  title: string;
  current: boolean;
}

interface FrameRedirect {
  from: string;
  to: string;
}

const framePage = (path: string | undefined): string => {
  const clean = (path ?? "").replace(/^\/+/u, "");

  if (clean === "" || /\.html?$/iu.test(clean)) {
    return clean.replace(/^.*\//u, "").replace(/\.html?$/iu, "") || "index";
  }

  return `/${clean}`;
};

const frameBaseName = (
  frame: Pick<CanvasFrame, "label" | "width" | "height">
): string => frame.label?.trim() || frameName(frame);

const frameTitle = (
  frame: Pick<CanvasFrame, "id" | "label" | "width" | "height" | "path">,
  frames?: readonly Pick<CanvasFrame, "id">[]
): string => {
  let index = -1;

  if (frames) {
    index = frames.findIndex((item) => item.id === frame.id);
  }

  let part = "";

  if (index >= 0) {
    part = `${index + 1} `;
  }

  return `${part}${frameBaseName(frame)} · ${framePage(frame.path)}`;
};

const canvasFrameName = (
  projectId: string,
  frameId: string,
  fallback: string
): string => {
  const frames = canvasStore.get(projectId)?.frames ?? [];
  const index = frames.findIndex((item) => item.id === frameId);
  const frame = frames[index];

  if (frame) {
    return `${index + 1} ${frameBaseName(frame)}`;
  }

  return fallback;
};

const isAuthRoute = (route: string): boolean =>
  /sign-?in|log-?in|auth/iu.test(route);

export { canvasFrameName, frameBaseName, framePage, frameTitle, isAuthRoute };

export type { FrameBadge, FrameRedirect };
