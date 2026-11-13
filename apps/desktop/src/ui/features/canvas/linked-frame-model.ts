import type { SelectionContext } from "@design-studio/contracts";
import { toLinkedSpot } from "@design-studio/contracts/linked-frame";
import { cleanLinkText } from "@design-studio/contracts/links";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import type { Box, Point } from "./prototype-model.js";

interface LinkedDragEnd {
  readonly at: Point;
  readonly host: Box | null;
  readonly selection: SelectionContext;
}

interface LinkedDrop extends LinkedDragEnd {
  readonly ghost: Box | null;
}

const LABEL_MAX = 80;

const BLOCKING_HOSTS =
  "[data-frame-id], .artboard, button, input, textarea, select, [role='dialog'], [role='toolbar'], [role='menu']";

const isBlockedBy = (element: Element, stage: Element): boolean => {
  const host = element.closest(BLOCKING_HOSTS);

  return host !== null && host !== stage;
};

const isEmptyStageAt = (x: number, y: number): boolean => {
  const elements = document.elementsFromPoint(x, y);
  const stage = elements.at(0)?.closest(".stage") ?? null;

  if (stage === null) {
    return false;
  }

  const above = elements.slice(0, elements.indexOf(stage));

  return !above.some((element) => isBlockedBy(element, stage));
};

const toHostBox = (handle: HTMLElement): Box | null => {
  const host = handle.closest<HTMLElement>("[data-frame-id]");

  if (!host) {
    return null;
  }

  const box = host.getBoundingClientRect();

  return { height: box.height, width: box.width, x: box.x, y: box.y };
};

const toGhostBox = (
  host: Box | null,
  frames: readonly CanvasFrame[],
  source: CanvasFrame
): Box | null => {
  if (host === null || source.width <= 0) {
    return null;
  }

  const scale = host.width / source.width;
  const spot = toLinkedSpot(frames, source);

  return {
    height: source.height * scale,
    width: source.width * scale,
    x: host.x + (spot.x - source.x) * scale,
    y: host.y + (spot.y - source.y) * scale,
  };
};

const toLinkedLabel = (selection: SelectionContext): string | null => {
  const text = cleanLinkText(selection.text)?.trim() ?? "";

  if (text === "") {
    return null;
  }

  return text.slice(0, LABEL_MAX);
};

const toLinkedQuestion = (selection: SelectionContext): string => {
  const label = toLinkedLabel(selection);

  if (label === null) {
    return copy.linkedFrameAskPlain;
  }

  return `${copy.linkedFrameAskStart}${label}${copy.linkedFrameAskEnd}`;
};

const toPromptOrNull = (prompt: string): string | null => {
  const trimmed = prompt.trim();

  if (trimmed === "") {
    return null;
  }

  return trimmed;
};

const isHtmlKind = (kind: string): boolean => kind === "html";

export {
  isEmptyStageAt,
  isHtmlKind,
  toGhostBox,
  toHostBox,
  toLinkedLabel,
  toLinkedQuestion,
  toPromptOrNull,
};

export type { LinkedDragEnd, LinkedDrop };
