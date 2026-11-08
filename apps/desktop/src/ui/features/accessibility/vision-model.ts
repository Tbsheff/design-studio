import type { WireOutput } from "@design-studio/actions/_core/action";
import type { runVisionAccessibility } from "@design-studio/actions/accessibility/run-vision";

import type { ContrastPair } from "./deps.js";

type VisionReport = WireOutput<typeof runVisionAccessibility>;

type VisionKind = VisionReport["cells"][number]["kind"];

type VisionLost = VisionReport["cells"][number]["lostPairs"][number];

interface CanvasFrameRef {
  readonly directionId?: string | null;
  readonly hidden?: boolean;
  readonly id: string;
}

const VISION_KINDS: readonly VisionKind[] = [
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "achromatopsia",
  "blurred-vision",
  "reduced-contrast",
];

const CHECKS_MARK = "checks/";

const toggleKind = (
  kinds: readonly VisionKind[],
  kind: VisionKind
): readonly VisionKind[] => {
  if (kinds.includes(kind)) {
    return kinds.filter((item) => item !== kind);
  }

  return VISION_KINDS.filter((item) => item === kind || kinds.includes(item));
};

const toProjectFilePath = (absolute: string): string => {
  const at = absolute.lastIndexOf(CHECKS_MARK);

  if (at === -1) {
    return absolute;
  }

  return absolute.slice(at);
};

const toFrameId = (
  frames: readonly CanvasFrameRef[],
  directionId: string
): string | null => {
  const mine = frames.filter(
    (frame) => (frame.directionId ?? directionId) === directionId
  );

  return (mine.find((frame) => frame.hidden !== true) ?? mine[0])?.id ?? null;
};

const toContrastPair = (lost: VisionLost): ContrastPair => ({
  background: lost.background,
  fix: null,
  foreground: lost.afterForeground,
  large: false,
  need: lost.need,
  passes: false,
  ratio: lost.after,
  selector: lost.layerId,
  source: null,
  tag: "",
  text: lost.text,
  token: lost.nearestToken,
});

const hasFindings = (report: VisionReport): boolean =>
  report.confusedPairs.length > 0 ||
  report.cells.some((cell) => cell.lostPairs.length > 0);

export {
  VISION_KINDS,
  hasFindings,
  toContrastPair,
  toFrameId,
  toProjectFilePath,
  toggleKind,
};

export type { CanvasFrameRef, VisionKind, VisionLost, VisionReport };
