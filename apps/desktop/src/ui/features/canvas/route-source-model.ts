import type { WireOutput } from "@design-studio/actions/_core/action";
import type { inspectSourcePage } from "@design-studio/actions/page/inspect-source";

import type { CanvasFrame } from "./canvas-layout-types.js";
import { copy } from "./copy.js";

type PageSourceWire = WireOutput<typeof inspectSourcePage>;

interface RouteSourceInput {
  readonly directionId: string;
  readonly file: string;
  readonly projectId: string;
}

const HTML_PAGE = /\.html?$/u;

const toPageFile = (path: string | null): string | null => {
  if (path === null) {
    return null;
  }

  const file = path.split(/[?#]/u)[0]?.replace(/^\/+/u, "") ?? "";

  if (!HTML_PAGE.test(file)) {
    return null;
  }

  return file;
};

const toRouteSourceInput = (
  projectId: string,
  directionId: string | null,
  path: string | null
): RouteSourceInput | null => {
  const file = toPageFile(path);

  if (directionId === null || file === null) {
    return null;
  }

  return { directionId, file, projectId };
};

const toChangedName = (
  item: PageSourceWire["changedFiles"][number]
): string => {
  if (item.change === "deleted") {
    return `${item.file}${copy.appFileDeleted}`;
  }

  return item.file;
};

const toRouteSourceTip = (source: PageSourceWire | null): string => {
  const items = source?.changedFiles ?? [];
  const names = items.map((item) => toChangedName(item)).join(", ");

  if (items.length === 1) {
    return `${copy.appFileChanged}${names}`;
  }

  return `${items.length}${copy.appFilesChanged}${names}`;
};

const isRouteSourceChanged = (source: PageSourceWire | null): boolean =>
  source?.isRouteCopy === true && source.isChanged;

const toCopyStem = (file: string): string =>
  `${file.replace(HTML_PAGE, "")}-app`;

const toCopyFrame = (
  frames: readonly CanvasFrame[],
  file: string
): CanvasFrame | null => {
  const stem = toCopyStem(file);

  const copies = frames.filter((frame) =>
    (toPageFile(frame.path ?? null) ?? "").startsWith(stem)
  );

  return copies.at(-1) ?? null;
};

const toFrameById = (
  frames: readonly CanvasFrame[],
  frameId: string | null
): CanvasFrame | null => {
  if (frameId === null) {
    return null;
  }

  return frames.find((frame) => frame.id === frameId) ?? null;
};

export {
  isRouteSourceChanged,
  toCopyFrame,
  toFrameById,
  toRouteSourceInput,
  toRouteSourceTip,
};

export type { PageSourceWire, RouteSourceInput };
