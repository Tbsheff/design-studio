import type { OutgoingBody, Rect } from "./bridge-types.js";
import { isString } from "./dom-input.js";
import { queryElement, rectOf } from "./element-info.js";

const NEIGHBOR_MAX = 200;
const SELECTOR_MAX = 2000;

function neighborRects(selector: unknown): {
  parent: Rect | null;
  siblings: Rect[];
} {
  let element: Element | null = null;
  if (isString(selector) && selector.length <= SELECTOR_MAX)
    element = queryElement(selector);
  const parent = element?.parentElement;
  if (!element || !parent) return { parent: null, siblings: [] };
  const siblings = Array.from(parent.children)
    .filter((child) => child !== element)
    .slice(0, NEIGHBOR_MAX)
    .map(rectOf)
    .filter((rect) => rect.width > 0 || rect.height > 0);
  return { parent: rectOf(parent), siblings };
}

function sameElements(a: (Element | null)[], b: (Element | null)[]): boolean {
  return (
    a.length === b.length && a.every((element, index) => element === b[index])
  );
}

interface RectTracker {
  track(selectors: string[]): void;
  schedule(): void;
}

function resizeObserverFor(onResize: () => void): ResizeObserver | null {
  if ("ResizeObserver" in window) return new ResizeObserver(onResize);
  return null;
}

function createRectTracker(post: (body: OutgoingBody) => void): RectTracker {
  let selectors: string[] = [];
  let observed: (Element | null)[] = [];
  let frame = 0;
  const observer = resizeObserverFor(() => schedule());

  const observe = (elements: (Element | null)[]): void => {
    if (!observer || sameElements(elements, observed)) return;
    observed = elements;
    observer.disconnect();
    if (elements.length === 0) return;
    observer.observe(document.documentElement);
    for (const element of elements) if (element) observer.observe(element);
  };

  const send = (): void => {
    frame = 0;
    if (selectors.length === 0) return;
    const elements = selectors.map(queryElement);
    observe(elements);
    post({
      rects: elements.map((element) => {
        if (element) return rectOf(element);
        return null;
      }),
      selectors,
      type: "rects",
    });
  };

  function schedule(): void {
    if (selectors.length === 0 || frame) return;
    frame = window.requestAnimationFrame(send);
  }

  const track = (next: string[]): void => {
    selectors = next;
    if (frame) window.cancelAnimationFrame(frame);
    if (next.length === 0) {
      frame = 0;
      observe([]);
      return;
    }
    send();
  };

  return { schedule, track };
}

export { createRectTracker, neighborRects, resizeObserverFor, sameElements };
