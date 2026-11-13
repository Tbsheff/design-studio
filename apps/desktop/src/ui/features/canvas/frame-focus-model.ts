import type { CanvasFrame } from "./canvas-layout-types.js";

interface FrameFocusFiles {
  readonly count: number;
  readonly files: readonly string[];
  readonly skipped: number;
}

const HTML_PAGE = /\.html?$/iu;

const INDEX_PAGE = "index.html";

const NO_FRAME_FOCUS: FrameFocusFiles = { count: 0, files: [], skipped: 0 };

const toFramePageFile = (
  path: string | null,
  isApp: boolean
): string | null => {
  const file = (path ?? "").split(/[?#]/u)[0]?.replace(/^\/+/u, "") ?? "";

  if (file === "" && !isApp) {
    return INDEX_PAGE;
  }

  if (!HTML_PAGE.test(file) || file.split("/").includes("..")) {
    return null;
  }

  return file;
};

const toFramePageFiles = (
  frames: readonly CanvasFrame[],
  ids: readonly string[],
  isApp: boolean
): FrameFocusFiles => {
  const idSet = new Set(ids);
  const picked = frames.filter((frame) => idSet.has(frame.id));

  if (picked.length === 0) {
    return NO_FRAME_FOCUS;
  }

  const files = new Set<string>();
  let skipped = 0;

  for (const frame of picked) {
    const file = toFramePageFile(frame.path ?? null, isApp);

    if (file === null) {
      skipped += 1;
    } else {
      files.add(file);
    }
  }

  return { count: picked.length, files: [...files], skipped };
};

export { NO_FRAME_FOCUS, toFramePageFile, toFramePageFiles };

export type { FrameFocusFiles };
