import { startFrameOf, withImplicit } from "@design-studio/contracts/links";
import type { LinksFile } from "@design-studio/contracts/links";
import { SHARE_PLAY_FILES_PATH } from "@design-studio/contracts/share-play";
import type {
  SharePlayData,
  SharePlayFrame,
  ShareViewerComment,
} from "@design-studio/contracts/share-play";
import type { CSSProperties } from "react";

interface ViewerFrame {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  path?: string;
  label?: string;
}

interface PinSpot {
  readonly frame: number;
  readonly x: number;
  readonly y: number;
}

interface SharePlayInput {
  readonly file: LinksFile;
  readonly frames: ViewerFrame[];
  readonly isFullBleed: boolean;
  readonly onClose: () => void;
  readonly startId: string;
  readonly urlOf: (frame: ViewerFrame) => Promise<string | null>;
}

type ViewMode = "canvas" | "play";

const PHONE_WIDTH = 768;

const toViewerFrame = (frame: SharePlayFrame): ViewerFrame => {
  const out: ViewerFrame = {
    height: frame.height,
    id: frame.id,
    width: frame.width,
    x: frame.left,
    y: frame.top,
  };

  if (frame.path !== null) {
    out.path = frame.path;
  }

  if (frame.label !== null) {
    out.label = frame.label;
  }

  return out;
};

const toViewerFrames = (data: SharePlayData): ViewerFrame[] =>
  data.frames.map((frame) => toViewerFrame(frame));

const toLinksFile = (data: SharePlayData): LinksFile =>
  withImplicit(data.links, data.implicit);

const hasOutgoing = (file: LinksFile, frameId: string): boolean =>
  file.links.some((link) => link.from.frame === frameId);

const toStartId = (file: LinksFile, frames: readonly ViewerFrame[]): string => {
  const start = startFrameOf(file, frames);

  if (file.start || hasOutgoing(file, start)) {
    return start;
  }

  return frames.find((frame) => hasOutgoing(file, frame.id))?.id ?? start;
};

const toTrimmedEnd = (text: string): string => {
  let end = text.length;

  while (end > 0 && text[end - 1] === "/") {
    end -= 1;
  }

  return text.slice(0, end);
};

const toTrimmedStart = (text: string): string => {
  let start = 0;

  while (start < text.length && text[start] === "/") {
    start += 1;
  }

  return text.slice(start);
};

const toFrameUrl = (frame: { readonly path?: string }): string => {
  const base = toTrimmedEnd(globalThis.location.pathname);
  const path = toTrimmedStart(frame.path ?? "");

  return `${globalThis.location.origin}${base}${SHARE_PLAY_FILES_PATH}${path}`;
};

const isPhoneViewer = (): boolean =>
  globalThis.matchMedia("(pointer: coarse)").matches ||
  globalThis.innerWidth < PHONE_WIDTH;

const toInitialMode = (): ViewMode => {
  if (isPhoneViewer()) {
    return "play";
  }

  return "canvas";
};

const toFramePins = (
  comments: readonly ShareViewerComment[],
  index: number
): readonly ShareViewerComment[] =>
  comments.filter((comment) => comment.frame === index);

const toSpotStyle = (spot: {
  readonly x: number;
  readonly y: number;
}): CSSProperties => ({ left: spot.x, top: spot.y });

const toFrameStyle = (frame: ViewerFrame): CSSProperties => ({
  height: frame.height,
  left: frame.x,
  top: frame.y,
  width: frame.width,
});

const toFrameTitle = (frame: { readonly label?: string }): string =>
  frame.label ?? "";

export {
  isPhoneViewer,
  toFramePins,
  toFrameStyle,
  toSpotStyle,
  toFrameTitle,
  toFrameUrl,
  toInitialMode,
  toLinksFile,
  toStartId,
  toViewerFrames,
};

export type { PinSpot, SharePlayInput, ViewerFrame, ViewMode };
