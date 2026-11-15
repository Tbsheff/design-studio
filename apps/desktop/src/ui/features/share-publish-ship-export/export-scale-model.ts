import {
  EXPORT_SCALES,
  isPngScaleAllowed,
} from "@design-studio/contracts/export";
import type { ExportFrame, ExportScale } from "@design-studio/contracts/export";

const toTallest = (frames: readonly ExportFrame[]): number =>
  Math.max(0, ...frames.map((frame) => frame.height));

const isScaleOff = (
  scale: ExportScale,
  frames: readonly ExportFrame[]
): boolean => !isPngScaleAllowed(toTallest(frames), scale);

const toAllowedScale = (
  scale: ExportScale,
  frames: readonly ExportFrame[]
): ExportScale => {
  if (!isScaleOff(scale, frames)) {
    return scale;
  }

  const lower = EXPORT_SCALES.filter(
    (each) => each < scale && !isScaleOff(each, frames)
  );

  return lower.at(-1) ?? 1;
};

export { isScaleOff, toAllowedScale };
