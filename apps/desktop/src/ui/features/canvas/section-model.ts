import {
  CANVAS_MAX_COORD,
  CANVAS_MAX_SECTIONS,
  CANVAS_SECTION_MIN_SIDE,
  cleanFrameLabel,
  nextSectionId,
} from "@design-studio/contracts/canvas-file";
import type { CanvasSection } from "@design-studio/contracts/canvas-file";

import type { Box, CanvasFrame, CanvasLayout } from "./canvas-layout-types.js";

interface SectionEdit {
  readonly layout: CanvasLayout | null;
  readonly sections: CanvasSection[];
}

type SectionHandle = "nw" | "ne" | "sw" | "se";

const PAD_SIDE = 48;

const PAD_TOP = 64;

const clampCoord = (value: number): number =>
  Math.max(-CANVAS_MAX_COORD, Math.min(CANVAS_MAX_COORD, Math.round(value)));

const isInside = (section: Box, frame: Box): boolean =>
  frame.x >= section.x &&
  frame.y >= section.y &&
  frame.x + frame.width <= section.x + section.width &&
  frame.y + frame.height <= section.y + section.height;

const toInsideFrames = (
  section: Box,
  frames: readonly CanvasFrame[]
): CanvasFrame[] => {
  const inside: CanvasFrame[] = [];

  for (const frame of frames) {
    if (isInside(section, frame)) {
      inside.push(frame);
    }
  }

  return inside;
};

const toInsideIds = (section: Box, frames: readonly CanvasFrame[]): string[] =>
  toInsideFrames(section, frames).map((frame) => frame.id);

const toSectionLabel = (sections: readonly CanvasSection[]): string => {
  let count = sections.length + 1;

  while (sections.some((section) => section.label === `Section ${count}`)) {
    count += 1;
  }

  return `Section ${count}`;
};

const toSectionAround = (
  sections: readonly CanvasSection[],
  frames: readonly CanvasFrame[]
): CanvasSection | null => {
  const [first] = frames;

  if (!first || sections.length >= CANVAS_MAX_SECTIONS) {
    return null;
  }

  const left = Math.min(...frames.map((frame) => frame.x));
  const top = Math.min(...frames.map((frame) => frame.y));
  const right = Math.max(...frames.map((frame) => frame.x + frame.width));
  const bottom = Math.max(...frames.map((frame) => frame.y + frame.height));

  return {
    height: bottom - top + PAD_TOP + PAD_SIDE,
    id: nextSectionId(sections),
    label: toSectionLabel(sections),
    width: right - left + PAD_SIDE * 2,
    x: clampCoord(left - PAD_SIDE),
    y: clampCoord(top - PAD_TOP),
  };
};

const replaceSection = (
  sections: readonly CanvasSection[],
  next: CanvasSection
): CanvasSection[] =>
  sections.map((section) => {
    if (section.id === next.id) {
      return next;
    }

    return section;
  });

const toMovedEdit = (
  layout: CanvasLayout,
  sections: readonly CanvasSection[],
  section: CanvasSection,
  delta: { readonly x: number; readonly y: number }
): SectionEdit => {
  const inside = new Set(toInsideIds(section, layout.frames));
  const dx = Math.round(delta.x);
  const dy = Math.round(delta.y);

  return {
    layout: {
      ...layout,
      frames: layout.frames.map((frame) => {
        if (!inside.has(frame.id)) {
          return frame;
        }

        return {
          ...frame,
          x: clampCoord(frame.x + dx),
          y: clampCoord(frame.y + dy),
        };
      }),
    },
    sections: replaceSection(sections, {
      ...section,
      x: clampCoord(section.x + dx),
      y: clampCoord(section.y + dy),
    }),
  };
};

const toSign = (isFlipped: boolean): number => {
  if (isFlipped) {
    return -1;
  }

  return 1;
};

const toStart = (isFlipped: boolean, flipped: number, kept: number): number => {
  if (isFlipped) {
    return flipped;
  }

  return kept;
};

const toResized = (
  section: CanvasSection,
  handle: SectionHandle,
  delta: { readonly x: number; readonly y: number }
): CanvasSection => {
  const dx = Math.round(delta.x);
  const dy = Math.round(delta.y);
  const isWest = handle === "nw" || handle === "sw";
  const isNorth = handle === "nw" || handle === "ne";
  const rawWidth = section.width + dx * toSign(isWest);
  const rawHeight = section.height + dy * toSign(isNorth);
  const width = Math.max(CANVAS_SECTION_MIN_SIDE, rawWidth);
  const height = Math.max(CANVAS_SECTION_MIN_SIDE, rawHeight);
  const right = section.x + section.width;
  const bottom = section.y + section.height;

  return {
    ...section,
    height,
    width,
    x: clampCoord(toStart(isWest, right - width, section.x)),
    y: clampCoord(toStart(isNorth, bottom - height, section.y)),
  };
};

const toResizedEdit = (
  sections: readonly CanvasSection[],
  section: CanvasSection,
  handle: SectionHandle,
  delta: { readonly x: number; readonly y: number }
): SectionEdit => ({
  layout: null,
  sections: replaceSection(sections, toResized(section, handle, delta)),
});

const toRenamedEdit = (
  sections: readonly CanvasSection[],
  section: CanvasSection,
  raw: string
): SectionEdit => {
  const label = cleanFrameLabel(raw);

  if (label === null || label === section.label) {
    return { layout: null, sections: [...sections] };
  }

  return {
    layout: null,
    sections: replaceSection(sections, { ...section, label }),
  };
};

const toRemovedEdit = (
  sections: readonly CanvasSection[],
  sectionId: string
): SectionEdit => ({
  layout: null,
  sections: sections.filter((section) => section.id !== sectionId),
});

export {
  toInsideIds,
  toMovedEdit,
  toRemovedEdit,
  toRenamedEdit,
  toResizedEdit,
  toSectionAround,
};

export type { SectionEdit, SectionHandle };
