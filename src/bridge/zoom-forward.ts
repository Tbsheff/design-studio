import { appKeyOf, isModZoomKey, zoomKeyOf } from "../shared/contracts.js";
import { vectorToolKeyOf } from "../shared/vector.js";
import type { OutgoingBody } from "./bridge-types.js";
import { eventElement, isTypingElement } from "./dom-input.js";
import { arrangeChordOf, isLayoutKey } from "./inlineStyle.js";

const freshAppKey = (event: KeyboardEvent): ReturnType<typeof appKeyOf> => {
  if (event.repeat) {
    return null;
  }

  return appKeyOf(event, isTypingElement(eventElement(event)));
};

const forwardKey = (
  event: KeyboardEvent,
  post: (body: OutgoingBody) => void
): void => {
  const app = freshAppKey(event);

  if (app) {
    event.preventDefault();
    post({ id: app, type: "app-key" });

    return;
  }

  if (event.key === "Escape" && !event.repeat) {
    post({ type: "escape" });
  }

  if (isLayoutKey(event) && !isTypingElement(eventElement(event))) {
    event.preventDefault();
    post({ type: "layout-key" });

    return;
  }

  const chord = arrangeChordOf(event);

  if (chord && !isTypingElement(eventElement(event))) {
    event.preventDefault();
    post({ key: chord, type: "arrange-key" });

    return;
  }

  const tool = vectorToolKeyOf(event);

  if (tool && !isTypingElement(eventElement(event))) {
    post({ tool, type: "tool-key" });

    return;
  }

  const key = zoomKeyOf(event);

  if (!key) {
    return;
  }

  const mod = isModZoomKey(event);

  if (!mod && isTypingElement(eventElement(event))) {
    return;
  }

  event.preventDefault();
  const at = performance.timeOrigin + performance.now();

  post({ at, key, type: "zoom-key" });
};

type WheelBody = Extract<OutgoingBody, { type: "wheel" }>;

const forwardZoomInput = (post: (body: OutgoingBody) => void): void => {
  let pending: WheelBody | null = null;
  let frame = 0;

  const flush = (): void => {
    frame = 0;
    const body = pending;
    pending = null;

    if (body) {
      post(body);
    }
  };

  const onWheel = (event: WheelEvent): void => {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    event.preventDefault();

    if (pending && pending.deltaMode !== event.deltaMode) {
      flush();
    }

    pending = {
      clientX: event.clientX,
      clientY: event.clientY,
      ctrlKey: event.ctrlKey,
      deltaMode: event.deltaMode,
      deltaX: (pending?.deltaX ?? 0) + event.deltaX,
      deltaY: (pending?.deltaY ?? 0) + event.deltaY,
      metaKey: event.metaKey,
      type: "wheel",
    };

    if (!frame) {
      frame = window.requestAnimationFrame(flush);
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    forwardKey(event, post);
  };

  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  window.addEventListener("keydown", onKeyDown, { capture: true });
};

export { forwardZoomInput };
