import type { BridgeToParent } from "@design-studio/contracts";

import { toTextKeyId } from "../shared/text-keys.js";
import { IS_MAC } from "./dom-input.js";
import { toPlainOffset } from "./text-edit-range-mode.js";
import { listStyleTags, toRangeTarget } from "./text-range-target.js";
import type { RangeTarget } from "./text-range-target.js";

type TextRangeMessage = Extract<BridgeToParent, { type: "text-range" }>;

type TextRangeKeyMessage = Extract<BridgeToParent, { type: "text-range-key" }>;

type TextRangeBody =
  | Omit<TextRangeKeyMessage, "ns" | "token">
  | Omit<TextRangeMessage, "ns" | "token">;

type TextRangeCommand = TextRangeKeyMessage["command"];

type TextRangeShot = Omit<TextRangeMessage, "ns" | "token">;

interface TextRangeDeps {
  readonly post: (body: TextRangeBody) => void;
  readonly selectorFor: (element: Element) => string;
  readonly textOf: (element: HTMLElement) => string;
}

interface TextRangeWatch {
  readonly element: HTMLElement;
  readonly original: string;
  readonly selector: string;
}

interface TextRangeSpan {
  readonly end: number;
  readonly start: number;
}

interface TextRangeReporter {
  readonly lastRange: () => TextRangeSpan | null;
  readonly onKey: (event: KeyboardEvent) => boolean;
  readonly unwatch: () => void;
  readonly watch: (target: TextRangeWatch) => void;
}

interface RangeReading {
  readonly end: number;
  readonly layerEnd: number;
  readonly layerStart: number;
  readonly rect: TextRangeMessage["rect"];
  readonly start: number;
  readonly styleTags: string[];
  readonly target: RangeTarget;
}

const COMMAND_TAGS: Readonly<Record<TextRangeCommand, ReadonlySet<string>>> = {
  bold: new Set(["strong", "b"]),
  italic: new Set(["em", "i"]),
  link: new Set(["a"]),
  strike: new Set(["s", "del", "strike"]),
  underline: new Set(["u", "ins"]),
};

const NO_TAGS: ReadonlySet<string> = new Set();

const STYLE_TAGS: ReadonlySet<string> = new Set(
  Object.values(COMMAND_TAGS).flatMap((tags) => tags.values().toArray())
);

const toReading = (
  element: HTMLElement,
  tags: ReadonlySet<string>
): RangeReading | null => {
  const selection = globalThis.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!element.contains(range.commonAncestorContainer)) {
    return null;
  }

  const box = range.getBoundingClientRect();
  const target = toRangeTarget(element, range, tags);

  return {
    end: toPlainOffset(target.element, range.endContainer, range.endOffset),
    layerEnd: toPlainOffset(element, range.endContainer, range.endOffset),
    layerStart: toPlainOffset(element, range.startContainer, range.startOffset),
    rect: { height: box.height, width: box.width, x: box.x, y: box.y },
    start: toPlainOffset(
      target.element,
      range.startContainer,
      range.startOffset
    ),
    styleTags: listStyleTags(target.element, range, STYLE_TAGS),
    target,
  };
};

const toLineCommandOf = (event: KeyboardEvent): TextRangeCommand | null => {
  const id = toTextKeyId(event, IS_MAC);

  if (id === "text-underline") {
    return "underline";
  }

  if (id === "text-strike") {
    return "strike";
  }

  return null;
};

const toCommandOf = (event: KeyboardEvent): TextRangeCommand | null => {
  const line = toLineCommandOf(event);

  if (line !== null) {
    return line;
  }

  let hasMod = event.ctrlKey;

  if (IS_MAC) {
    hasMod = event.metaKey;
  }

  if (!hasMod || event.altKey || event.shiftKey) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (key === "b") {
    return "bold";
  }

  if (key === "i") {
    return "italic";
  }

  if (key === "k") {
    return "link";
  }

  return null;
};

const toShot = (
  deps: TextRangeDeps,
  watched: TextRangeWatch,
  reading: RangeReading | null
): TextRangeShot => {
  const rendered = deps.textOf(watched.element);

  const base = {
    isDirty: rendered !== watched.original,
    selector: watched.selector,
    tag: watched.element.tagName.toLowerCase(),
    text: rendered,
    type: "text-range",
  } as const;

  if (reading === null) {
    return {
      ...base,
      end: 0,
      isDirty: false,
      layer: { end: 0, selector: watched.selector, start: 0, text: "" },
      rect: null,
      source: null,
      start: 0,
      styleTags: [],
      text: "",
    };
  }

  const layer = {
    end: reading.layerEnd,
    selector: watched.selector,
    start: reading.layerStart,
    text: rendered,
  };

  if (reading.target.source === null) {
    return {
      ...base,
      end: reading.end,
      layer,
      rect: reading.rect,
      source: null,
      start: reading.start,
      styleTags: reading.styleTags,
      tag: reading.target.tag,
    };
  }

  const child = reading.target.element;

  return {
    ...base,
    end: reading.end,
    layer,
    rect: reading.rect,
    selector: deps.selectorFor(child),
    source: reading.target.source,
    start: reading.start,
    styleTags: reading.styleTags,
    tag: child.tagName.toLowerCase(),
    text: deps.textOf(child),
  };
};

const toKeyBody = (
  shot: TextRangeShot,
  reading: RangeReading,
  keyCommand: TextRangeCommand
): Omit<TextRangeKeyMessage, "ns" | "token"> => ({
  className: reading.target.element.getAttribute("class") ?? "",
  command: keyCommand,
  end: shot.end,
  layer: shot.layer,
  selector: shot.selector,
  source: shot.source,
  start: shot.start,
  tag: shot.tag,
  text: shot.text,
  type: "text-range-key",
});

const toReadingKey = (reading: RangeReading | null): string => {
  if (reading === null) {
    return "null";
  }

  return JSON.stringify({ ...reading, target: reading.target.source });
};

const createTextRange = (deps: TextRangeDeps): TextRangeReporter => {
  let current: TextRangeWatch | null = null;
  let lastKey = "";
  let lastSpan: TextRangeSpan | null = null;

  const report = (): void => {
    if (!current) {
      return;
    }

    const reading = toReading(current.element, NO_TAGS);
    const key = toReadingKey(reading);

    if (key === lastKey) {
      return;
    }

    lastKey = key;

    if (reading !== null) {
      lastSpan = { end: reading.layerEnd, start: reading.layerStart };
    }

    deps.post(toShot(deps, current, reading));
  };

  const unwatch = (): void => {
    document.removeEventListener("selectionchange", report);

    if (current && lastKey !== "null" && lastKey !== "") {
      deps.post(toShot(deps, current, null));
    }

    current = null;
    lastKey = "";
  };

  const watch = (target: TextRangeWatch): void => {
    current = target;
    lastKey = "";
    lastSpan = null;
    document.addEventListener("selectionchange", report);
  };

  const onKey = (event: KeyboardEvent): boolean => {
    const command = toCommandOf(event);

    if (command === null || !current) {
      return false;
    }

    event.preventDefault();
    const reading = toReading(current.element, COMMAND_TAGS[command]);

    if (reading === null || event.repeat) {
      return true;
    }

    const shot = toShot(deps, current, reading);

    if (!shot.isDirty) {
      deps.post(toKeyBody(shot, reading, command));
    }

    return true;
  };

  const lastRange = (): TextRangeSpan | null => lastSpan;

  return { lastRange, onKey, unwatch, watch };
};

export { createTextRange };

export type { TextRangeBody, TextRangeDeps, TextRangeReporter, TextRangeWatch };
