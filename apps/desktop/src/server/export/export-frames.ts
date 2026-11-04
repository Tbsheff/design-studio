import type { CanvasFileFrame } from "@design-studio/actions/_core/canvas-file";
import { EXPORT_MAX_FRAMES } from "@design-studio/actions/_core/export";
import type { ExportFrame } from "@design-studio/actions/_core/export";
import { findFrame } from "../canvas/index.js";

type FramePick =
  | { readonly frames: ExportFrame[]; readonly ok: true }
  | { readonly message: string; readonly ok: false };

const DEFAULT_FRAME: ExportFrame = {
  height: 900,
  name: "Desktop",
  width: 1440,
};

const toExportFrame = (frame: CanvasFileFrame): ExportFrame => {
  const out: ExportFrame = {
    height: frame.height,
    name: frame.label?.trim() || `${frame.width} × ${frame.height}`,
    width: frame.width,
  };

  if (frame.path) {
    out.path = frame.path;
  }

  return out;
};

const pickRefs = (
  all: readonly CanvasFileFrame[],
  refs: readonly string[]
): FramePick => {
  const frames: ExportFrame[] = [];

  for (const ref of refs) {
    const found = findFrame(all, ref);

    if (!found && all.length === 0 && ref === "f1") {
      frames.push(DEFAULT_FRAME);
    } else if (found) {
      frames.push(toExportFrame(found));
    } else {
      return {
        message: `No frame ${ref} on the canvas. Call canvas_list for frame ids.`,
        ok: false,
      };
    }
  }

  return { frames, ok: true };
};

const isOwnFrame = (frame: CanvasFileFrame, directionId: string): boolean =>
  !frame.hidden && (!frame.directionId || frame.directionId === directionId);

const pickExportFrames = (
  all: readonly CanvasFileFrame[],
  directionId: string,
  refs: readonly string[] | null
): FramePick => {
  if (refs !== null) {
    return pickRefs(all, refs);
  }

  const own = all
    .filter((frame) => isOwnFrame(frame, directionId))
    .toSorted((left, right) => left.order - right.order);

  if (own.length === 0) {
    return { frames: [DEFAULT_FRAME], ok: true };
  }

  return {
    frames: own
      .slice(0, EXPORT_MAX_FRAMES)
      .map((frame) => toExportFrame(frame)),
    ok: true,
  };
};

export { DEFAULT_FRAME, pickExportFrames };

export type { FramePick };
