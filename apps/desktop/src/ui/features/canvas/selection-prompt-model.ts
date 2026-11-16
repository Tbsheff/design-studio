import type { SelectionContext } from "@design-studio/contracts";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";

const BOX_OFFSET = 8;
const EDGE_GAP = 8;
const ASK_ROOM = 28;
const SNIPPET_MAX = 16;
const MS_PER_SECOND = 1000;
const START_GRACE_MS = 4000;

interface PromptRect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface PromptBounds {
  readonly height: number;
  readonly width: number;
}

interface PromptPlacement {
  readonly isAbove: boolean;
  readonly shift: number;
}

interface ScreenBox {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

type PromptPhase =
  | { readonly kind: "closed" }
  | { readonly kind: "open" }
  | {
      readonly hasStarted: boolean;
      readonly kind: "working";
      readonly label: string;
      readonly sentAt: number;
    };

interface PlaceholderCopy {
  readonly placeholder: string;
  readonly waitPlaceholder: string;
}

const CLOSED: PromptPhase = { kind: "closed" };

const OPEN: PromptPhase = { kind: "open" };

const BELOW: PromptPlacement = { isAbove: false, shift: 0 };

const toSnippet = (text: string): string => {
  const flat = text.replaceAll(/\s+/gu, " ").trim();

  if (flat.length > SNIPPET_MAX) {
    return `${flat.slice(0, SNIPPET_MAX - 1)}…`;
  }

  return flat;
};

const toSelectionLabel = (
  selection: readonly SelectionContext[],
  many: string
): string => {
  const last = selection.at(-1);

  if (selection.length > 1) {
    return `${selection.length}${many}`;
  }

  if (!last) {
    return "";
  }

  if (last.component) {
    return last.component;
  }

  const snippet = toSnippet(last.text);

  if (snippet) {
    return `“${snippet}”`;
  }

  return last.tag;
};

const toUnionRect = (
  selection: readonly SelectionContext[]
): PromptRect | null => {
  const [first, ...rest] = selection;

  if (!first) {
    return null;
  }

  let left = first.rect.x;
  let top = first.rect.y;
  let right = first.rect.x + first.rect.width;
  let bottom = first.rect.y + first.rect.height;

  for (const item of rest) {
    left = Math.min(left, item.rect.x);
    top = Math.min(top, item.rect.y);
    right = Math.max(right, item.rect.x + item.rect.width);
    bottom = Math.max(bottom, item.rect.y + item.rect.height);
  }

  return { height: bottom - top, width: right - left, x: left, y: top };
};

const toClippedRect = (
  rect: PromptRect | null,
  bounds: PromptBounds
): PromptRect | null => {
  if (rect === null) {
    return null;
  }

  const left = Math.max(rect.x, 0);
  const top = Math.max(rect.y, 0);
  const right = Math.min(rect.x + rect.width, bounds.width);
  const bottom = Math.min(rect.y + rect.height, bounds.height);

  if (right <= left || bottom <= top) {
    return null;
  }

  return { height: bottom - top, width: right - left, x: left, y: top };
};

const toBoxStyle = (
  rect: PromptRect,
  zoom: number,
  placement: PromptPlacement
): CSSProperties => {
  const translate = `${placement.shift}px 0`;

  if (placement.isAbove) {
    return {
      left: rect.x,
      top: rect.y,
      transform: `scale(${1 / zoom}) translateY(calc(-100% - ${BOX_OFFSET}px))`,
      translate,
    };
  }

  return {
    left: rect.x,
    top: rect.y + rect.height,
    transform: `scale(${1 / zoom}) translateY(${BOX_OFFSET}px)`,
    translate,
  };
};

const toPlacement = (
  box: ScreenBox,
  bounds: ScreenBox,
  zoom: number,
  previous: PromptPlacement
): PromptPlacement => {
  const maxRight = bounds.right - EDGE_GAP;
  const minLeft = bounds.left + EDGE_GAP;
  let delta = 0;

  if (box.right > maxRight) {
    delta = maxRight - box.right;
  }

  if (box.left + delta < minLeft) {
    delta = minLeft - box.left;
  }

  const isAbove = previous.isAbove || box.bottom > bounds.bottom - EDGE_GAP;

  return { isAbove, shift: previous.shift + delta / zoom };
};

const toAskStyle = (rect: PromptRect, zoom: number): CSSProperties => {
  if (rect.y * zoom < ASK_ROOM) {
    return {
      left: rect.x,
      top: rect.y,
      transform: `scale(${1 / zoom}) translate(4px, 4px)`,
    };
  }

  return {
    left: rect.x,
    top: rect.y,
    transform: `scale(${1 / zoom}) translateY(calc(-100% - 4px))`,
  };
};

const toElapsedSeconds = (sentAt: number, now: number): number =>
  Math.max(0, Math.floor((now - sentAt) / MS_PER_SECOND));

const isRunOver = (
  phase: PromptPhase,
  isRunning: boolean,
  now: number
): boolean => {
  if (phase.kind !== "working" || isRunning) {
    return false;
  }

  return phase.hasStarted || now - phase.sentAt > START_GRACE_MS;
};

const toWorkingPhase = (label: string, sentAt: number): PromptPhase => ({
  hasStarted: false,
  kind: "working",
  label,
  sentAt,
});

const toStartedPhase = (
  phase: PromptPhase,
  isRunning: boolean
): PromptPhase => {
  if (phase.kind === "working" && isRunning && !phase.hasStarted) {
    return { ...phase, hasStarted: true };
  }

  return phase;
};

const toPlaceholder = (isRunning: boolean, text: PlaceholderCopy): string => {
  if (isRunning) {
    return text.waitPlaceholder;
  }

  return text.placeholder;
};

const stopPointer = (event: PointerEvent<HTMLElement>): void => {
  event.stopPropagation();
};

const stopWheel = (event: WheelEvent<HTMLElement>): void => {
  event.stopPropagation();
};

export {
  BELOW,
  CLOSED,
  OPEN,
  isRunOver,
  stopPointer,
  stopWheel,
  toAskStyle,
  toBoxStyle,
  toElapsedSeconds,
  toPlaceholder,
  toPlacement,
  toSelectionLabel,
  toClippedRect,
  toStartedPhase,
  toUnionRect,
  toWorkingPhase,
};

export type { PromptBounds, PromptPhase, PromptPlacement, PromptRect };
