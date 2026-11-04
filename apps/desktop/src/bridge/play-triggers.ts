import type { PlayRunOp, PlayTriggerPhase } from "@design-studio/contracts";
import type { LinkQuery } from "@design-studio/contracts/links";

import { closestLink, resolveLink } from "./play.js";

const TRIGGER_TYPE = "play-trigger";

type TriggerPost = (body: {
  id: string;
  phase: PlayTriggerPhase;
  type: typeof TRIGGER_TYPE;
}) => void;

interface TriggerBridge {
  readonly install: () => void;
  readonly run: (op: PlayRunOp, selector: string) => void;
  readonly set: (links: readonly LinkQuery[]) => void;
}

const SHOWN_DISPLAY = "block";

const ownsTarget = (query: LinkQuery, target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  if (closestLink(query, target)) {
    return true;
  }

  return resolveLink(query)?.contains(target) ?? false;
};

const queryElement = (selector: string): Element | null => {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
};

const isHidden = (element: HTMLElement): boolean =>
  getComputedStyle(element).display === "none";

const showElement = (element: HTMLElement): void => {
  element.style.removeProperty("display");

  if (isHidden(element)) {
    element.style.display = SHOWN_DISPLAY;
  }
};

const hideElement = (element: HTMLElement): void => {
  element.style.display = "none";
};

const toggleElement = (element: HTMLElement): void => {
  if (isHidden(element)) {
    showElement(element);

    return;
  }

  hideElement(element);
};

const runOn = (op: PlayRunOp, element: HTMLElement): void => {
  if (op === "scroll") {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (op === "show") {
    showElement(element);
  }

  if (op === "hide") {
    hideElement(element);
  }

  if (op === "toggle") {
    toggleElement(element);
  }
};

const run = (op: PlayRunOp, selector: string): void => {
  const element = queryElement(selector);

  if (element instanceof HTMLElement) {
    runOn(op, element);
  }
};

const createTriggerBridge = (post: TriggerPost): TriggerBridge => {
  let queries: LinkQuery[] = [];
  const hovered = new Set<string>();
  const pressed = new Set<string>();

  const of = (kind: "hover" | "press"): LinkQuery[] =>
    queries.filter((query) => query.trigger === kind);

  const onOver = (event: PointerEvent): void => {
    for (const query of of("hover")) {
      if (!hovered.has(query.id) && ownsTarget(query, event.target)) {
        hovered.add(query.id);
        post({ id: query.id, phase: "enter", type: TRIGGER_TYPE });
      }
    }
  };

  const onOut = (event: PointerEvent): void => {
    for (const query of of("hover")) {
      if (hovered.has(query.id) && !ownsTarget(query, event.relatedTarget)) {
        hovered.delete(query.id);
        post({ id: query.id, phase: "leave", type: TRIGGER_TYPE });
      }
    }
  };

  const onDown = (event: PointerEvent): void => {
    for (const query of of("press")) {
      if (ownsTarget(query, event.target)) {
        pressed.add(query.id);
        post({ id: query.id, phase: "down", type: TRIGGER_TYPE });
      }
    }
  };

  const onUp = (): void => {
    for (const id of pressed) {
      post({ id, phase: "up", type: TRIGGER_TYPE });
    }

    pressed.clear();
  };

  const install = (): void => {
    globalThis.addEventListener("pointerover", onOver, { capture: true });
    globalThis.addEventListener("pointerout", onOut, { capture: true });
    globalThis.addEventListener("pointerdown", onDown, { capture: true });
    globalThis.addEventListener("pointerup", onUp, { capture: true });
    globalThis.addEventListener("pointercancel", onUp, { capture: true });
  };

  const set = (links: readonly LinkQuery[]): void => {
    queries = links.filter((query) => query.trigger);
    hovered.clear();
    pressed.clear();
  };

  return { install, run, set };
};

export { createTriggerBridge };

export type { TriggerBridge };
