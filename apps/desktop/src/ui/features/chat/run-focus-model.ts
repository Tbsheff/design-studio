import { copy } from "./copy.js";

interface FrameFocus {
  readonly count: number;
  readonly files: readonly string[];
  readonly skipped: number;
}

const FOCUS_MAX = 20;

const FRAME_FOCUS_MIN = 2;

const DOT_SLASH = /^(?:\.\/)+/u;

const BACKSLASH = /\\/gu;

const toFocusPath = (raw: string): string | null => {
  const text = raw.trim().replaceAll(BACKSLASH, "/").replace(DOT_SLASH, "");

  if (
    text === "" ||
    text.startsWith("/") ||
    text.split("/").includes("..") ||
    text.includes("?file=")
  ) {
    return null;
  }

  return text;
};

const toFocusWith = (list: readonly string[], raw: string): string[] => {
  const path = toFocusPath(raw);

  if (path === null || list.includes(path) || list.length >= FOCUS_MAX) {
    return [...list];
  }

  return [...list, path];
};

const toFocusWithAll = (
  list: readonly string[],
  files: readonly string[]
): string[] => {
  let next = [...list];

  for (const file of files) {
    next = toFocusWith(next, file);
  }

  return next;
};

const canFocusFrames = (
  frames: FrameFocus | null,
  paths: readonly string[]
): boolean => {
  if (frames === null || frames.count < FRAME_FOCUS_MIN) {
    return false;
  }

  const added = new Set(paths);

  return frames.files.some((file) => !added.has(file));
};

const toFramesLabel = (frames: FrameFocus): string =>
  `${copy.focusOnFrames}${frames.count}${copy.focusOnFramesTail}`;

const toFramesTip = (frames: FrameFocus): string => {
  if (frames.skipped === 0) {
    return copy.focusFramesTip;
  }

  return `${copy.focusFramesTip}. ${frames.skipped}${copy.focusFramesLeftOut}`;
};

const toFocusWithout = (list: readonly string[], path: string): string[] =>
  list.filter((item) => item !== path);

const toFocusLabel = (path: string): string => path.split("/").pop() ?? path;

export {
  canFocusFrames,
  FOCUS_MAX,
  toFocusLabel,
  toFocusPath,
  toFocusWith,
  toFocusWithAll,
  toFocusWithout,
  toFramesLabel,
  toFramesTip,
};

export type { FrameFocus };
