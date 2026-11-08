import type { BridgeToParent } from "@design-studio/contracts";
import { routeLabel } from "@design-studio/contracts/app";
import { cleanFrameLabel } from "@design-studio/contracts/canvas-file";

import { readStored, writeStored } from "../../platform/storage.js";
import {
  addFrame,
  canAddFrame,
  setFramePath,
  withoutKey,
} from "./canvas-frame-ops.js";
import type { CanvasLayout } from "./canvas-frames-model.js";

const trimSlashes = (text: string, isLeadingTrimmed: boolean): string => {
  let start = 0;
  let end = text.length;

  if (isLeadingTrimmed) {
    while (start < end && text[start] === "/") {
      start += 1;
    }
  }

  while (end > start && text[end - 1] === "/") {
    end -= 1;
  }

  return text.slice(start, end);
};

const routeFrameId = (layout: CanvasLayout, route: string): string | null => {
  const path = trimSlashes(route, true);

  return (
    layout.frames.find((frame) => trimSlashes(frame.path ?? "", false) === path)
      ?.id ?? null
  );
};

const withoutHidden = (
  frame: CanvasLayout["frames"][number]
): CanvasLayout["frames"][number] => withoutKey(frame, "hidden");

const addRouteFrame = (
  layout: CanvasLayout,
  route: string,
  size: { width: number; height: number }
): CanvasLayout => {
  const path = route.replace(/^\/+/u, "");
  const existing = routeFrameId(layout, route);

  if (existing) {
    return {
      ...layout,
      activeId: existing,
      frames: layout.frames.map((canvasFrame) => {
        if (canvasFrame.id === existing && canvasFrame.hidden) {
          return withoutHidden(canvasFrame);
        }

        return canvasFrame;
      }),
    };
  }

  if (!canAddFrame(layout)) {
    return layout;
  }

  const added = addFrame(layout, size);
  const frame = added.frames.at(-1);

  if (!frame) {
    return layout;
  }

  const withPath = setFramePath(added, frame.id, path);
  const label = cleanFrameLabel(routeLabel(route));

  const target = withPath.frames.find((item) => item.id === frame.id);

  if (!target || !label) {
    return { ...withPath, activeId: frame.id };
  }

  const labelled = { ...target, label };

  return {
    ...withPath,
    activeId: frame.id,
    frames: withPath.frames.map((canvasFrameValue) => {
      if (canvasFrameValue.id === frame.id) {
        return labelled;
      }

      return canvasFrameValue;
    }),
  };
};

type Listen = (handler: (message: BridgeToParent) => void) => () => void;

const HIDDEN_REDIRECTS_KEY = "design-studio.hidden-redirects.v1";

const MAX_HIDDEN_REDIRECTS = 50;

const readHiddenRedirects = (): string[] => {
  try {
    const raw: unknown = JSON.parse(readStored(HIDDEN_REDIRECTS_KEY) ?? "[]");

    if (Array.isArray(raw)) {
      return raw.filter((item): item is string => typeof item === "string");
    }

    return [];
  } catch {
    return [];
  }
};

const writeHiddenRedirects = (keys: string[]): boolean => {
  try {
    writeStored(HIDDEN_REDIRECTS_KEY, JSON.stringify(keys));

    return true;
  } catch {
    return false;
  }
};

export {
  MAX_HIDDEN_REDIRECTS,
  trimSlashes,
  addRouteFrame,
  readHiddenRedirects,
  routeFrameId,
  writeHiddenRedirects,
};

export type { Listen };
