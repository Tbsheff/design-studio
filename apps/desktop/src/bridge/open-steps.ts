import type { OpenStep } from "@design-studio/contracts/frame-state";

import type { BridgeState, Post } from "./bridge-types.js";
import { queryElement } from "./element-info.js";

const FIND_MS = 6000;
const FIND_POLL_MS = 100;
const SETTLE_MS = 250;
const WATCH_MS = 400;
const VERIFY_MS = 8000;
const VERIFY_POLL_MS = 350;

const OPEN_STATES = new Set([
  "open",
  "active",
  "on",
  "checked",
  "delayed-open",
  "instant-open",
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

const needsVerify = (step: OpenStep, element: HTMLElement): boolean =>
  step.kind !== "focus" &&
  (element.hasAttribute("aria-expanded") || "state" in element.dataset);

const settleStep = (
  state: BridgeState,
  step: OpenStep,
  element: HTMLElement,
  onDone: (isOk: boolean) => void
): void => {
  const until = performance.now() + VERIFY_MS;
  let isFirst = true;

  const tick = (): void => {
    if (!isFirst && isOpen(element)) {
      onDone(true);

      return;
    }

    if (!isFirst && performance.now() >= until) {
      onDone(false);

      return;
    }

    isFirst = false;
    actOn(state, step, element);

    if (needsVerify(step, element)) {
      globalThis.setTimeout(tick, VERIFY_POLL_MS);
    } else {
      onDone(true);
    }
  };

  tick();
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

interface RunContext {
  readonly canRun: () => boolean;
  readonly done: (missed: number[]) => void;
  readonly found: (HTMLElement | null)[];
  readonly state: BridgeState;
  readonly steps: readonly OpenStep[];
}

const toMissed = (missed: number[], index: number, isOk: boolean): number[] => {
  if (isOk) {
    return missed;
  }

  return [...missed, index];
};

const runFrom = (ctx: RunContext, index: number, missed: number[]): void => {
  const step = ctx.steps[index];

  if (!ctx.canRun()) {
    return;
  }

  if (!step) {
    ctx.done(missed);

    return;
  }

  waitForElement(step.selector, (element) => {
    if (!ctx.canRun()) {
      return;
    }

    if (!element) {
      runFrom(ctx, index + 1, [...missed, index]);

      return;
    }

    settleStep(ctx.state, step, element, (isOk) => {
      ctx.found[index] = element;
      const next = toMissed(missed, index, isOk);

      globalThis.setTimeout(() => runFrom(ctx, index + 1, next), SETTLE_MS);
    });
  });
};

interface Runner {
  readonly begin: (steps: readonly OpenStep[]) => void;
  readonly cancel: () => void;
  readonly needsRerun: () => boolean;
  readonly restart: () => void;
}

const createRunner = (state: BridgeState, post: Post): Runner => {
  let steps: readonly OpenStep[] = [];
  let runId = 0;
  let isRunning = false;
  let found: (HTMLElement | null)[] = [];

  const restart = (): void => {
    runId += 1;
    const id = runId;
    isRunning = true;
    found = steps.map(() => null);

    runFrom(
      {
        canRun: () => id === runId,
        done: (missed) => {
          isRunning = false;
          post({ missed, type: "open-steps-result" });
        },
        found,
        state,
        steps,
      },
      0,
      []
    );
  };

  const begin = (next: readonly OpenStep[]): void => {
    steps = next;
    restart();
  };

  const cancel = (): void => {
    runId += 1;
    isRunning = false;
    found = [];
  };

  const needsRerun = (): boolean => !isRunning && hasDetached(found);

  return { begin, cancel, needsRerun, restart };
};

const createOpenSteps = (state: BridgeState, post: Post): OpenSteps => {
  const runner = createRunner(state, post);
  let lastKey = "";
  let watcher: MutationObserver | null = null;
  let watchTimer: Timer | null = null;

  const check = (): void => {
    watchTimer = null;

    if (runner.needsRerun()) {
      runner.restart();
    }
  };

  const set = (next: readonly OpenStep[]): void => {
    const key = JSON.stringify(next);

    if (key === lastKey && watcher && !runner.needsRerun()) {
      return;
    }

    lastKey = key;

    if (next.length === 0) {
      runner.cancel();
      lastKey = "";
      watcher?.disconnect();
      watcher = null;

      return;
    }

    watcher ??= observeDocument(() => {
      watchTimer ??= globalThis.setTimeout(check, WATCH_MS);
    });

    runner.begin(next);
  };

  return { set };
};

export { createOpenSteps };

export type { OpenSteps };
