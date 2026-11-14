import type { CanvasGuide } from "@design-studio/contracts/canvas-file";
import type { CanvasLayoutGrid } from "@design-studio/contracts/layout-grid";

import { toLayoutGridText } from "./layout-grid-text.js";

interface FrameRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface FrameContext {
  readonly guides?: readonly CanvasGuide[] | null;
  readonly layoutGrid?: CanvasLayoutGrid | null;
}

interface GuideSpan {
  readonly start: number;
  readonly size: number;
}

const toSpan = (axis: CanvasGuide["axis"], rect: FrameRect): GuideSpan => {
  if (axis === "x") {
    return { size: rect.width, start: rect.x };
  }

  return { size: rect.height, start: rect.y };
};

const toLocalAt = (guide: CanvasGuide, rect: FrameRect): number | null => {
  const { size, start } = toSpan(guide.axis, rect);
  const at = guide.at - start;

  if (at < 0 || at > size) {
    return null;
  }

  return Math.round(at);
};

const toFrameGuides = (
  guides: readonly CanvasGuide[],
  rect: FrameRect | null
): CanvasGuide[] => {
  if (rect === null) {
    return [];
  }

  return guides.flatMap((guide) => {
    const at = toLocalAt(guide, rect);

    if (at === null) {
      return [];
    }

    return [{ at, axis: guide.axis }];
  });
};

const toGuideText = (guides: readonly CanvasGuide[] | null): string => {
  if (guides === null || guides.length === 0) {
    return "";
  }

  const sorted = [...guides].toSorted(
    (first, second) =>
      first.axis.localeCompare(second.axis) || first.at - second.at
  );

  const values = sorted.map((guide) => `${guide.axis} ${guide.at}`).join(", ");

  return `, guides ${values} (frame-local)`;
};

const toFrameContextText = (frame: FrameContext): string =>
  `${toLayoutGridText(frame.layoutGrid ?? null)}${toGuideText(frame.guides ?? null)}`;

export { toFrameContextText, toFrameGuides, toGuideText };

export type { FrameRect };
