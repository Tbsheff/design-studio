import { useSyncExternalStore } from "react";

import { commentPageName, pageShown } from "./comment-anchors.js";
import { canvasStore, projectFromPath, shownFrames } from "./deps.js";
import type { DesignComment } from "./deps.js";

const PATH_MARK = "\n";

const toShownPathsKey = (): string => {
  const projectId = projectFromPath(globalThis.location.pathname);

  if (!projectId) {
    return "";
  }

  const layout = canvasStore.get(projectId);

  if (!layout) {
    return "";
  }

  return shownFrames(layout)
    .map((frame) => `${PATH_MARK}${frame.path ?? ""}`)
    .join("");
};

const useShownPaths = (): string[] | null => {
  const key = useSyncExternalStore(canvasStore.subscribe, toShownPathsKey);

  if (!key) {
    return null;
  }

  return key.split(PATH_MARK).slice(1);
};

const toNotShownText = (
  comment: DesignComment,
  paths: string[] | null
): string | null => {
  if (pageShown(comment, paths)) {
    return null;
  }

  return `On ${commentPageName(comment)}, not shown`;
};

export { toNotShownText, useShownPaths };
