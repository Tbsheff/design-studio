import type { SharePresenceCursor } from "@design-studio/contracts/share";

import { findElement, findElements } from "../../platform/find-element.js";
import type { CursorNode } from "./share-cursor-node.js";

const FRAME_SELECTOR = ".artboard[data-frame-id], .canvas-frame[data-frame-id]";
const FIRST_FRAME_SELECTOR = ".artboard[data-frame-id]";
const FIRST_FRAME_KEY = "#first";

interface FrameLookup {
  readonly clear: () => void;
  readonly toFrame: (
    root: HTMLElement,
    cursor: SharePresenceCursor
  ) => HTMLElement | null;
}

const findFrame = (
  root: HTMLElement,
  cursor: SharePresenceCursor
): HTMLElement | null => {
  if (cursor.frameId) {
    return (
      findElements(root, FRAME_SELECTOR).find(
        (element) => element.dataset["frameId"] === cursor.frameId
      ) ?? null
    );
  }

  if (cursor.frame === 0) {
    return findElement(root, FIRST_FRAME_SELECTOR);
  }

  return null;
};

const createFrameLookup = (): FrameLookup => {
  const frames = new Map<string, HTMLElement>();

  return {
    clear: (): void => {
      frames.clear();
    },
    toFrame: (root, cursor): HTMLElement | null => {
      const key = cursor.frameId ?? FIRST_FRAME_KEY;
      const cached = frames.get(key);

      if (cached?.isConnected) {
        return cached;
      }

      const found = findFrame(root, cursor);

      if (found) {
        frames.set(key, found);
      } else {
        frames.delete(key);
      }

      return found;
    },
  };
};

const toTransform = (
  frame: HTMLElement,
  cursor: SharePresenceCursor,
  box: DOMRect
): string => {
  const rect = frame.getBoundingClientRect();
  const scale = rect.width / frame.offsetWidth;

  const left =
    rect.left - box.left + Math.min(cursor.x, frame.offsetWidth) * scale;

  const top =
    rect.top - box.top + Math.min(cursor.y, frame.offsetHeight) * scale;

  return `translate(${left}px, ${top}px)`;
};

const placeCursor = (
  node: CursorNode,
  frame: HTMLElement | null,
  cursor: SharePresenceCursor,
  box: DOMRect
): void => {
  const { element } = node;

  if (!frame || frame.offsetWidth === 0) {
    element.hidden = true;

    return;
  }

  element.hidden = false;
  element.classList.toggle("below", cursor.y > frame.offsetHeight);
  element.style.transform = toTransform(frame, cursor, box);
};

export { createFrameLookup, placeCursor };

export type { FrameLookup };
