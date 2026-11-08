import { withFrameStateHost } from "@design-studio/contracts/frame-state";
import { useCallback, useRef } from "react";
import type { RefObject } from "react";

import { api } from "../../api.js";
import { frameDirection } from "./canvas-direction-ops.js";
import { withFramePath } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { frameStateOf, useCurrentFrameStates } from "./frame-states-model.js";
import type { PrototypeOptions } from "./prototype-options-model.js";
import { runOrReport, toValueOr } from "./settle-model.js";

type UrlCache = RefObject<Map<string, Promise<string>>>;

type FrameStates = ReturnType<typeof useCurrentFrameStates>;

type UrlResolver = (frame: CanvasFrame) => Promise<string | null>;

const fetchDirectionUrl = async (
  projectId: string,
  directionId: string
): Promise<string> => {
  const result = await api.directionPreview(projectId, directionId);

  return result.url;
};

const toCachedUrl = (
  options: PrototypeOptions,
  cache: UrlCache,
  directionId: string
): Promise<string> => {
  const known = cache.current.get(directionId);

  if (known) {
    return known;
  }

  const url = fetchDirectionUrl(options.projectId, directionId);
  cache.current.set(directionId, url);
  void runOrReport(url, () => cache.current.delete(directionId));

  return url;
};

const toBaseUrl = async (
  options: PrototypeOptions,
  cache: UrlCache,
  frame: CanvasFrame
): Promise<string | null> => {
  const did = frameDirection(frame, options.directionId);

  if (!did) {
    return null;
  }

  if (did === options.directionId && options.baseUrl) {
    return withFramePath(options.baseUrl, frame.path);
  }

  const base = await toValueOr(toCachedUrl(options, cache, did), null);

  if (base === null) {
    return null;
  }

  return withFramePath(base, frame.path);
};

const toStateUrl = (
  frameStates: FrameStates,
  frame: CanvasFrame,
  url: string
): string => {
  if (frameStates) {
    return withFrameStateHost(url, frameStateOf(frameStates.view, frame.id));
  }

  return url;
};

const usePrototypeUrls = (options: PrototypeOptions): UrlResolver => {
  const cache = useRef(new Map<string, Promise<string>>());
  const frameStates = useCurrentFrameStates();

  return useCallback(
    async (frame: CanvasFrame): Promise<string | null> => {
      const url = await toBaseUrl(options, cache, frame);

      if (url) {
        return toStateUrl(frameStates, frame, url);
      }

      return null;
    },
    [options, frameStates]
  );
};

export { usePrototypeUrls };
