import { routes } from "@design-studio/actions/share/routes";
import type {
  SharePresenceCursor,
  SharePresenceEvent,
  StudioCursorInput,
} from "@design-studio/contracts/share";

import type { BridgeFrame } from "../../platform/bridge.js";
import { call, getRaw } from "../../platform/http.js";
import {
  onSharePointer,
  setSharePointer,
} from "../design-system/token-frames.js";
import { SHARES_CHANGED } from "./share-api.js";

import "../../styles/share-live.css";

const RETRY_MS = 5000;
const SEND_MS = 50;
const FRAME_SELECTOR = ".artboard[data-frame-id], .canvas-frame[data-frame-id]";

const ARROW =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1l5.5 13 2-5.5L14 6.5z" fill="currentColor" stroke="white" stroke-width="1.2" stroke-linejoin="round"/></svg>';

const hueOf = (id: string): number => {
  let height = 0;

  for (const ch of id) {
    height = (height * 31 + ch.charCodeAt(0)) % 360;
  }

  return height;
};

const frameEl = (stage: HTMLElement, frameId: string): HTMLElement | null =>
  stage.querySelector<HTMLElement>(
    `.artboard[data-frame-id="${CSS.escape(frameId)}"], .canvas-frame[data-frame-id="${CSS.escape(frameId)}"]`
  );

const readEvents = async (
  res: Response,
  onEvent: (event: SharePresenceEvent) => void
): Promise<void> => {
  const reader = res.body?.getReader();

  if (!reader) {
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();

    if (done) {
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf("\n\n");

    while (cut >= 0) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      cut = buffer.indexOf("\n\n");

      if (/^event: ping/m.test(block)) {
        continue;
      }

      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (data) {
        onEvent(JSON.parse(data) as SharePresenceEvent);
      }
    }
  }
};

class CursorLayer {
  private layer: HTMLDivElement | null = null;
  private nodes = new Map<string, HTMLDivElement>();
  private raf = 0;
  readonly cursors = new Map<string, SharePresenceCursor>();

  constructor(private stage: () => HTMLElement | null) {}

  set(list: SharePresenceCursor[]): void {
    this.cursors.clear();

    for (const sharePresenceCursor of list) {
      this.cursors.set(
        `${sharePresenceCursor.linkId}:${sharePresenceCursor.viewer}`,
        sharePresenceCursor
      );
    }

    this.kick();
  }

  put(cursor: SharePresenceCursor): void {
    this.cursors.set(`${cursor.linkId}:${cursor.viewer}`, cursor);
    this.kick();
  }

  drop(linkId: string, viewer: string): void {
    this.cursors.delete(`${linkId}:${viewer}`);
    this.kick();
  }

  destroy(): void {
    globalThis.cancelAnimationFrame(this.raf);
    this.layer?.remove();
    this.layer = null;
    this.nodes.clear();
  }

  private kick(): void {
    if (!this.raf) {
      this.raf = globalThis.requestAnimationFrame(() => this.paint());
    }
  }

  private host(stage: HTMLElement): HTMLDivElement {
    if (this.layer && this.layer.parentElement === stage) {
      return this.layer;
    }

    this.layer?.remove();
    const layer = document.createElement("div");
    layer.className = "share-cursors";
    layer.setAttribute("aria-hidden", "true");
    stage.append(layer);
    this.layer = layer;
    this.nodes.clear();

    return layer;
  }

  private node(
    key: string,
    cursor: SharePresenceCursor,
    layer: HTMLDivElement
  ): HTMLDivElement {
    let el = this.nodes.get(key);

    if (!el) {
      el = document.createElement("div");
      el.className = "share-cursor";
      el.dataset.testid = "share-viewer-cursor";
      el.innerHTML = ARROW;
      el.append(document.createElement("span"));
      el.style.setProperty("--cursor-hue", String(hueOf(cursor.viewer)));
      layer.append(el);
      this.nodes.set(key, el);
    }

    const label = el.querySelector("span") as HTMLSpanElement;

    if (label.textContent !== cursor.name) {
      label.textContent = cursor.name;
    }

    return el;
  }

  private place(
    el: HTMLDivElement,
    cursor: SharePresenceCursor,
    stage: HTMLElement,
    box: DOMRect
  ): void {
    const frame = cursor.frameId
      ? frameEl(stage, cursor.frameId)
      : cursor.frame === 0
        ? stage.querySelector<HTMLElement>(".artboard[data-frame-id]")
        : null;

    if (!frame || frame.offsetWidth === 0) {
      el.hidden = true;

      return;
    }

    const domRect = frame.getBoundingClientRect();
    const scale = domRect.width / frame.offsetWidth;
    const below = cursor.y > frame.offsetHeight;
    el.hidden = false;
    el.classList.toggle("below", below);
    el.style.transform = `translate(${domRect.left - box.left + Math.min(cursor.x, frame.offsetWidth) * scale}px, ${domRect.top - box.top + Math.min(cursor.y, frame.offsetHeight) * scale}px)`;
  }

  private paint(): void {
    this.raf = 0;
    const stage = this.stage();

    if (!stage || this.cursors.size === 0) {
      this.layer?.remove();
      this.layer = null;
      this.nodes.clear();

      return;
    }

    const layer = this.host(stage);
    const box = stage.getBoundingClientRect();

    for (const [key, el] of this.nodes) {
      if (!this.cursors.has(key)) {
        el.remove();
        this.nodes.delete(key);
      }
    }

    for (const [key, cursor] of this.cursors) {
      this.place(this.node(key, cursor, layer), cursor, stage, box);
    }

    this.raf = globalThis.requestAnimationFrame(() => this.paint());
  }
}

const studioPointer = (
  projectId: string,
  stage: () => HTMLElement | null
): { set(next: boolean): void } => {
  let on = false;
  let pending: { value: StudioCursorInput | null } | null = null;
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let lastFrame: string | null = null;

  const flush = (): void => {
    timer = null;

    if (pending === null) {
      return;
    }

    const body = pending.value ?? { frameId: null, x: 0, y: 0 };
    pending = null;
    const send = async (): Promise<void> => {
      try {
        await call(routes.setCursorShare, {
          frameId: body.frameId,
          pointX: body.x,
          pointY: body.y,
          projectId,
        });
      } catch {
        return;
      }
    };
    void send();
  };

  const queue = (value: StudioCursorInput | null): void => {
    pending = { value };

    if (!timer) {
      timer = globalThis.setTimeout(flush, SEND_MS);
    }
  };

  const at = (from: Element | null, clientX: number, clientY: number): void => {
    const root = stage();
    const target = from?.closest<HTMLElement>(FRAME_SELECTOR) ?? null;

    if (
      !root ||
      !target ||
      !root.contains(target) ||
      target.offsetWidth === 0
    ) {
      onLeave();

      return;
    }

    const domRect = target.getBoundingClientRect();
    const scale = domRect.width / target.offsetWidth;
    lastFrame = target.dataset.frameId ?? null;
    queue({
      frameId: lastFrame,
      x: Math.max(0, (clientX - domRect.left) / scale),
      y: Math.max(0, (clientY - domRect.top) / scale),
    });
  };

  const onMove = (event: PointerEvent): void =>
    at(
      event.target instanceof Element ? event.target : null,
      event.clientX,
      event.clientY
    );

  const onFrame = (
    frame: BridgeFrame,
    message: { x: number; y: number; inside: boolean }
  ): void => {
    const iframe = frame.element;

    if (!message.inside || !iframe || iframe.offsetWidth === 0) {
      return;
    }

    const domRect = iframe.getBoundingClientRect();
    const scale = domRect.width / iframe.offsetWidth;
    at(
      iframe,
      domRect.left + message.x * scale,
      domRect.top + message.y * scale
    );
  };

  function onLeave(): void {
    if (lastFrame !== null) {
      queue(null);
    }

    lastFrame = null;
  }

  let offFrame: (() => void) | null = null;

  return {
    set(next: boolean): void {
      if (next === on) {
        return;
      }

      on = next;
      setSharePointer(on);

      if (on) {
        document.addEventListener("pointermove", onMove, true);
        document.documentElement.addEventListener("pointerleave", onLeave);
        offFrame = onSharePointer(onFrame);

        return;
      }

      document.removeEventListener("pointermove", onMove, true);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      offFrame?.();
      offFrame = null;
      onLeave();
    },
  };
};

const startShareLive = (
  projectId: string,
  stage: () => HTMLElement | null
): (() => void) => {
  const layer = new CursorLayer(stage);
  const pointer = studioPointer(projectId, stage);
  let stopped = false;
  let control: AbortController | null = null;
  let retry: ReturnType<typeof globalThis.setTimeout> | null = null;

  const handle = (event: SharePresenceEvent): void => {
    if (event.type === "state") {
      layer.set(event.cursors);
      pointer.set(event.wantCursor);
    } else if (event.type === "cursor") {
      layer.put(event.cursor);
    } else if (event.type === "leave") {
      layer.drop(event.linkId, event.viewer);
    }
  };

  const listen = async (
    own: AbortController,
    reconnect: () => void
  ): Promise<void> => {
    try {
      const res = await getRaw(
        `/api/projects/${encodeURIComponent(projectId)}/share-presence`,
        own.signal
      );

      if (res.ok) {
        await readEvents(res, handle);
      }
    } catch {
      own.abort();
    } finally {
      if (control === own && !stopped) {
        layer.set([]);
        pointer.set(false);
        retry = globalThis.setTimeout(reconnect, RETRY_MS);
      }
    }
  };

  const connect = (): void => {
    if (retry !== null) {
      globalThis.clearTimeout(retry);
    }

    control?.abort();

    if (stopped) {
      return;
    }

    const own = new AbortController();
    control = own;
    void listen(own, connect);
  };

  const onChanged = (event: Event): void => {
    if (
      (event as CustomEvent<{ projectId?: string }>).detail?.projectId ===
      projectId
    ) {
      connect();
    }
  };

  globalThis.addEventListener(SHARES_CHANGED, onChanged);
  connect();

  return () => {
    stopped = true;
    globalThis.removeEventListener(SHARES_CHANGED, onChanged);

    if (retry !== null) {
      globalThis.clearTimeout(retry);
    }

    control?.abort();
    pointer.set(false);
    layer.destroy();
  };
};

export { startShareLive };
