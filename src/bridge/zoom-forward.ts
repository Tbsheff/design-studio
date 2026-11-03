import {
  BRIDGE_CHANGES_PATH,
  zoomKeyOf,
  isModZoomKey,
  appKeyOf,
} from "../shared/contracts.js";
import { vectorToolKeyOf } from "../shared/vector.js";
import type { OutgoingBody } from "./bridge-types.js";
import { eventElement, isTypingElement } from "./dom-input.js";
import { arrangeChordOf, isLayoutKey } from "./inlineStyle.js";

async function reloadIfChanged(): Promise<void> {
  const loadStartedAt = performance.timeOrigin;
  try {
    const res = await fetch(BRIDGE_CHANGES_PATH, { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { changedAt?: unknown };
    const changedAt = body.changedAt;
    if (Number.isFinite(changedAt) && (changedAt as number) >= loadStartedAt)
      window.location.reload();
  } catch {
    return;
  }
}

function reloadIfChangedDuringLoad(): void {
  if (!document.querySelector('script[src="/@vite/client"]')) return;
  reloadIfChanged();
}

function freshAppKey(event: KeyboardEvent): ReturnType<typeof appKeyOf> {
  if (event.repeat) return null;
  return appKeyOf(event, isTypingElement(eventElement(event)));
}

type WheelBody = Extract<OutgoingBody, { type: "wheel" }>;

function forwardZoomInput(post: (body: OutgoingBody) => void): void {
  let pending: WheelBody | null = null;
  let frame = 0;

  const flush = (): void => {
    frame = 0;
    const body = pending;
    pending = null;
    if (body) post(body);
  };

  const onWheel = (event: WheelEvent): void => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    if (pending && pending.deltaMode !== event.deltaMode) flush();
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
    if (!frame) frame = window.requestAnimationFrame(flush);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const app = freshAppKey(event);
    if (app) {
      event.preventDefault();
      post({ id: app, type: "app-key" });
      return;
    }
    if (event.key === "Escape" && !event.repeat) post({ type: "escape" });
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
    if (!key) return;
    const mod = isModZoomKey(event);
    if (!mod && isTypingElement(eventElement(event))) return;
    event.preventDefault();
    post({
      at: performance.timeOrigin + performance.now(),
      key,
      type: "zoom-key",
    });
  };

  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  window.addEventListener("keydown", onKeyDown, { capture: true });
}

export { forwardZoomInput, reloadIfChangedDuringLoad };
