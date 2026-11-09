import type { MouseEvent } from "react";

import type { BridgeToParent } from "./deps.js";

type TextRangeMessage = Extract<BridgeToParent, { type: "text-range" }>;

type TextRangeKeyMessage = Extract<BridgeToParent, { type: "text-range-key" }>;

type TextRangeCommand = TextRangeKeyMessage["command"];

interface TextRangeBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface TextRangeReading {
  readonly end: number;
  readonly isDirty: boolean;
  readonly rect: TextRangeBox;
  readonly selector: string;
  readonly start: number;
  readonly tag: string;
  readonly text: string;
}

interface TextRangeFrame {
  readonly left: number;
  readonly scale: number;
  readonly top: number;
  readonly viewHeight: number;
  readonly viewWidth: number;
}

interface TextRangeSpot {
  readonly left: number;
  readonly top: number;
}

const BAR_HEIGHT = 36;

const BAR_GAP = 8;

const EDGE_MIN = 8;

const STYLE_TAGS = {
  bold: ["strong", "b"],
  italic: ["em", "i"],
  link: ["a"],
} as const satisfies Readonly<Record<TextRangeCommand, readonly string[]>>;

const COLOR_VALUE = /^(?:#|rgb|hsl|oklch|oklab|lab|lch|color\()/iu;

const toReading = (message: TextRangeMessage): TextRangeReading | null => {
  if (message.rect === null) {
    return null;
  }

  return {
    end: message.end,
    isDirty: message.isDirty,
    rect: message.rect,
    selector: message.selector,
    start: message.start,
    tag: message.tag,
    text: message.text,
  };
};

const toKeyReading = (
  message: TextRangeKeyMessage,
  box: TextRangeBox
): TextRangeReading => ({
  end: message.end,
  isDirty: false,
  rect: box,
  selector: message.selector,
  start: message.start,
  tag: message.tag,
  text: message.text,
});

const toIsRemove = (command: TextRangeCommand, tag: string): boolean => {
  const tags: readonly string[] = STYLE_TAGS[command];

  return tags.includes(tag);
};

const toSpot = (
  reading: TextRangeReading,
  frame: TextRangeFrame
): TextRangeSpot => {
  const left = frame.left + reading.rect.x * frame.scale;
  const top = frame.top + reading.rect.y * frame.scale;
  const below = top + reading.rect.height * frame.scale + BAR_GAP;
  let place = top - BAR_HEIGHT - BAR_GAP;

  if (place < EDGE_MIN) {
    place = below;
  }

  return {
    left: Math.max(EDGE_MIN, Math.min(left, frame.viewWidth - EDGE_MIN)),
    top: Math.max(EDGE_MIN, Math.min(place, frame.viewHeight - BAR_HEIGHT)),
  };
};

const keepFocus = (event: MouseEvent): void => event.preventDefault();

const isColorValue = (value: string): boolean => COLOR_VALUE.test(value.trim());

export { isColorValue, keepFocus, toIsRemove, toKeyReading, toReading, toSpot };

export type {
  TextRangeBox,
  TextRangeCommand,
  TextRangeFrame,
  TextRangeKeyMessage,
  TextRangeMessage,
  TextRangeReading,
  TextRangeSpot,
};
