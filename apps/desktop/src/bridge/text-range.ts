import type { BridgeToParent } from "@design-studio/contracts";

import { toTextKeyId } from "../shared/text-keys.js";
import { IS_MAC } from "./dom-input.js";

type TextRangeMessage = Extract<BridgeToParent, { type: "text-range" }>;

type TextRangeKeyMessage = Extract<BridgeToParent, { type: "text-range-key" }>;

type TextRangeBody =
  | Omit<TextRangeKeyMessage, "ns" | "token">
  | Omit<TextRangeMessage, "ns" | "token">;

type TextRangeCommand = TextRangeKeyMessage["command"];

type TextRangeShot = Omit<TextRangeMessage, "ns" | "token">;

interface TextRangeDeps {
  readonly post: (body: TextRangeBody) => void;
  readonly textOf: (element: HTMLElement) => string;
}

interface TextRangeWatch {
  readonly element: HTMLElement;
  readonly original: string;
  readonly selector: string;
}

interface TextRangeReporter {
  readonly onKey: (event: KeyboardEvent) => boolean;
  readonly unwatch: () => void;
  readonly watch: (target: TextRangeWatch) => void;
}

interface RangeReading {
  readonly end: number;
  readonly rect: TextRangeMessage["rect"];
  readonly start: number;
}

const toOffsetOf = (
  element: HTMLElement,
  node: Node,
  offset: number
): number => {
  const before = document.createRange();
  before.selectNodeContents(element);
  before.setEnd(node, offset);

  return before.toString().length;
};

const toReading = (element: HTMLElement): RangeReading | null => {
  const selection = globalThis.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!element.contains(range.commonAncestorContainer)) {
    return null;
  }

  const box = range.getBoundingClientRect();

  return {
    end: toOffsetOf(element, range.endContainer, range.endOffset),
    rect: { height: box.height, width: box.width, x: box.x, y: box.y },
    start: toOffsetOf(element, range.startContainer, range.startOffset),
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
  target: TextRangeWatch,
  reading: RangeReading | null,
  rendered: string
): TextRangeShot => {
  const base = {
    isDirty: rendered !== target.original,
    selector: target.selector,
    tag: target.element.tagName.toLowerCase(),
    text: rendered,
    type: "text-range",
  } as const;

  if (reading === null) {
    return { ...base, end: 0, isDirty: false, rect: null, start: 0, text: "" };
  }

  return { ...base, ...reading };
};

const createTextRange = (deps: TextRangeDeps): TextRangeReporter => {
  let current: TextRangeWatch | null = null;
  let lastKey = "";

  const report = (): void => {
    if (!current) {
      return;
    }

    const reading = toReading(current.element);
    const key = JSON.stringify(reading);

    if (key === lastKey) {
      return;
    }

    lastKey = key;
    deps.post(toShot(current, reading, deps.textOf(current.element)));
  };

  const unwatch = (): void => {
    document.removeEventListener("selectionchange", report);

    if (current && lastKey !== "null" && lastKey !== "") {
      deps.post(toShot(current, null, ""));
    }

    current = null;
    lastKey = "";
  };

  const watch = (target: TextRangeWatch): void => {
    current = target;
    lastKey = "";
    document.addEventListener("selectionchange", report);
  };

  const onKey = (event: KeyboardEvent): boolean => {
    const command = toCommandOf(event);

    if (command === null || !current) {
      return false;
    }

    event.preventDefault();
    const reading = toReading(current.element);

    if (reading === null || event.repeat) {
      return true;
    }

    const shot = toShot(current, reading, deps.textOf(current.element));

    if (!shot.isDirty) {
      const className = current.element.getAttribute("class") ?? "";

      deps.post({
        className,
        command,
        end: shot.end,
        selector: shot.selector,
        start: shot.start,
        tag: shot.tag,
        text: shot.text,
        type: "text-range-key",
      });
    }

    return true;
  };

  return { onKey, unwatch, watch };
};

export { createTextRange };

export type { TextRangeBody, TextRangeDeps, TextRangeReporter, TextRangeWatch };
