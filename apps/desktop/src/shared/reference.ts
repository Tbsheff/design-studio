import type { FinalCheck } from "@design-studio/contracts";

export const REFERENCE_NAME_PREFIX = "reference--";
export const REFERENCE_LOW_SCORE = 80;
export const REFERENCE_MAX_WIDTH = 1920;
export const COMPARE_TO_REFERENCE_TEXT = `Compare a canvas frame with a reference picture (a screenshot or mock, PNG, JPEG, GIF or WebP). The studio renders the frame at the frame width and the picture's aspect, scales the picture to that size, and returns a match score from 0 to 100 made of two parts: content (20%: of the pixels that are not plain background in either image, the percent that match in color, compared at 160 px wide) and edges (80%: how well the outlines of text, boxes, icons and pictures line up, to 2 px at 320 px wide, squared, so a moved column, a wrong icon or a CSS shape in place of a photo cost points while flat background does not help). It also returns both parts for the 3x3 areas that differ most with their x/y boxes, and the path of a side-by-side diff PNG (reference, render, render with the different pixels in red). A score under ${REFERENCE_LOW_SCORE} means the frame does not match the picture yet: fix the areas with the lowest edge numbers first. Read only; changes no file.`;

export function isReferenceName(name: string): boolean {
  return name.startsWith(REFERENCE_NAME_PREFIX);
}

export function asReferenceName(name: string): string {
  return isReferenceName(name) ? name : `${REFERENCE_NAME_PREFIX}${name}`;
}

export function plainAttachmentName(name: string): string {
  return isReferenceName(name)
    ? name.slice(REFERENCE_NAME_PREFIX.length)
    : name;
}

export interface ReferenceRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  differsPct: number;
  contentDiffersPct: number;
  edgeMatchPct: number;
}

export interface ReferenceScore {
  score: number;
  contentScore: number;
  edgeScore: number;
  width: number;
  height: number;
  differsPct: number;
  regions: ReferenceRegion[];
  diffPath: string;
  renderPath: string;
  ms: number;
}

export interface ReferenceRecord {
  score: number | null;
  fixLoop: boolean;
  before?: number;
  diffPath?: string;
  name?: string;
  error?: string;
}

export type FinalCheckWithReference = FinalCheck & {
  reference?: ReferenceRecord;
};
