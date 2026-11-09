import type { OpenStep } from "@design-studio/contracts/frame-state";

import type { BridgeState, Post } from "./bridge-types.js";
import { queryElement } from "./element-info.js";

const FIND_MS = 6000;
const FIND_POLL_MS = 100;
const SETTLE_MS = 250;
const WATCH_MS = 400;

const OPEN_STATES = new Set([
  "open",
  "active",
  "on",
  "checked",
  "delayed-open",
]);

type Timer = ReturnType<typeof globalThis.setTimeout>;

interface OpenSteps {
  readonly set: (steps: readonly OpenStep[]) => void;
}

const isOpen = (element: HTMLElement): boolean =>
  element.getAttribute("aria-expanded") === "true" ||
  OPEN_STATES.has(element.dataset.state ?? "");

const fire = (
  element: HTMLElement,
  type: string,
  Event: typeof PointerEvent | typeof MouseEvent,
  pressed: number
): void => {
  const rect = element.getBoundingClientRect();

  const init: PointerEventInit = {
    bubbles: type !== "pointerenter" && type !== "mouseenter",
    button: 0,
    buttons: pressed,
    cancelable: true,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    composed: true,
    isPrimary: true,
    pointerId: 1,
    pointerType: "mouse",
    view: element.ownerDocument.defaultView,
  };

  element.dispatchEvent(new Event(type, init));
};

const pressElement = (element: HTMLElement): void => {
  if (isOpen(element)) {
    return;
  }

  fire(element, "pointerdown", PointerEvent, 1);
  fire(element, "mousedown", MouseEvent, 1);

  if (isOpen(element)) {
    return;
  }

  fire(element, "pointerup", PointerEvent, 0);
  fire(element, "mouseup", MouseEvent, 0);
  fire(element, "click", MouseEvent, 0);
};

const hoverElement = (element: HTMLElement): void => {
  if (isOpen(element)) {
    return;
  }

  fire(element, "pointerover", PointerEvent, 0);
  fire(element, "pointerenter", PointerEvent, 0);
  fire(element, "mouseover", MouseEvent, 0);
  fire(element, "mouseenter", MouseEvent, 0);
  fire(element, "pointermove", PointerEvent, 0);
  fire(element, "mousemove", MouseEvent, 0);
};

const performStep = (step: OpenStep, element: HTMLElement): void => {
  if (step.kind === "click") {
    pressElement(element);
  } else if (step.kind === "hover") {
    hoverElement(element);
  } else {
    element.focus({ preventScroll: true });
  }
};

const findHtml = (selector: string): HTMLElement | null => {
  const element = queryElement(selector);

  if (element instanceof HTMLElement) {
    return element;
  }

  return null;
};

const waitForElement = (
  selector: string,
  onDone: (element: HTMLElement | null) => void
): void => {
  const until = performance.now() + FIND_MS;

  const poll = (): void => {
    const element = findHtml(selector);

    if (element || performance.now() >= until) {
      onDone(element);

      return;
    }

    globalThis.setTimeout(poll, FIND_POLL_MS);
  };

  poll();
};

const actOn = (
  state: BridgeState,
  step: OpenStep,
  element: HTMLElement
): void => {
  const { mode } = state;
  state.mode = "none";

  try {
    performStep(step, element);
  } finally {
    state.mode = mode;
  }
};

const hasDetached = (found: readonly (HTMLElement | null)[]): boolean =>
  found.some((element) => element !== null && !element.isConnected);

const observeDocument = (onChange: () => void): MutationObserver => {
  const observer = new MutationObserver(onChange);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return observer;
};

const createOpenSteps = (state: BridgeState, post: Post): OpenSteps => {
  let steps: readonly OpenStep[] = [];
  let runId = 0;
  let isRunning = false;
  let found: (HTMLElement | null)[] = [];
  let watcher: MutationObserver | null = null;
  let watchTimer: Timer | null = null;

  const runStep = (id: number, index: number, missed: number[]): void => {
    const step = steps[index];

    if (id !== runId) {
      return;
    }

    if (!step) {
      isRunning = false;
      post({ missed, type: "open-steps-result" });

      return;
    }

    waitForElement(step.selector, (element) => {
      if (id !== runId) {
        return;
      }

      if (!element) {
        runStep(id, index + 1, [...missed, index]);

        return;
      }

      actOn(state, step, element);
      found[index] = element;
      globalThis.setTimeout(() => runStep(id, index + 1, missed), SETTLE_MS);
    });
  };

  const start = (): void => {
    runId += 1;
    isRunning = true;
    found = steps.map(() => null);
    runStep(runId, 0, []);
  };

  const check = (): void => {
    watchTimer = null;

    if (!isRunning && hasDetached(found)) {
      start();
    }
  };

  const set = (next: readonly OpenStep[]): void => {
    steps = next;

    if (steps.length === 0) {
      runId += 1;
      isRunning = false;
      found = [];
      watcher?.disconnect();
      watcher = null;

      return;
    }

    watcher ??= observeDocument(() => {
      watchTimer ??= globalThis.setTimeout(check, WATCH_MS);
    });

    start();
  };

  return { set };
};

export { createOpenSteps };

export type { OpenSteps };
