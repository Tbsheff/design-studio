import { useEffect, useRef } from "react";

import {
  BRIDGE_HANDSHAKE_TYPE,
  BRIDGE_HELLO_TYPE,
  BRIDGE_PARENT_ORIGIN_PARAM,
  CLOUD_BLOCKED_BRIDGE_TYPES,
} from "../../shared/actions/_core/contracts.js";
import type {
  BridgeToParent,
  ParentToBridge,
  ProjectKind,
} from "../../shared/actions/_core/contracts.js";

export interface BridgeFrame {
  key: string;
  token: string;
  url: string;
  kind: ProjectKind;
  element: HTMLIFrameElement | null;
  cloud?: boolean;
}

const FRAME_TOKEN_ATTR = "data-frame-token";
const MAX_PENDING = 50;

const ports = new Map<string, MessagePort>();
const documents = new Map<string, string>();
const pending = new Map<string, ParentToBridge[]>();
const listeners = new Set<(token: string, message: BridgeToParent) => void>();
let helloInstalled = false;

export const HTML_FRAME_SANDBOX = "allow-scripts allow-same-origin allow-forms";

export type ParentMessageBody = ParentToBridge extends infer M
  ? M extends ParentToBridge
    ? Omit<M, "ns" | "token">
    : never
  : never;

export interface PreviewPort {
  post: (body: ParentMessageBody) => void;
  refreshRects: () => void;
  listen?: (handler: (message: BridgeToParent) => void) => () => void;
}

function urlOrigin(url: string): string {
  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return "";
  }
}

function frameOrigin(frame: Pick<BridgeFrame, "url">): string {
  return urlOrigin(frame.url);
}

export function tagFrame(
  element: HTMLIFrameElement | null,
  token: string
): HTMLIFrameElement | null {
  element?.setAttribute(FRAME_TOKEN_ATTR, token);

  return element;
}

export function frameTokenOf(element: HTMLIFrameElement): string | null {
  return element.getAttribute(FRAME_TOKEN_ATTR);
}

export function frameSrc(
  previewUrl: string,
  extra?: Record<string, string>
): string {
  const url = new URL(previewUrl, window.location.href);
  url.searchParams.set(BRIDGE_PARENT_ORIGIN_PARAM, window.location.origin);

  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      url.searchParams.set(k, v);
    }
  }

  return url.toString();
}

export function postToFrame(frame: BridgeFrame, body: ParentMessageBody): void {
  const win = frame.element?.contentWindow;

  if (!win) {
    return;
  }

  const target = frameOrigin(frame);

  if (target === "") {
    return;
  }

  const message = {
    ns: "studio",
    token: frame.token,
    ...body,
  } as ParentToBridge;

  const port = ports.get(frame.token);

  if (port) {
    port.postMessage(message);

    return;
  }

  const queue = pending.get(frame.token) ?? [];

  if (queue.length < MAX_PENDING) {
    queue.push(message);
    pending.set(frame.token, queue);
  }
}

function isBridgeMessage(data: unknown): data is BridgeToParent {
  if (!data || typeof data !== "object") {
    return false;
  }

  const m = data as { ns?: unknown; token?: unknown; type?: unknown };

  return m.ns === "studio" && Boolean(m.token) && Boolean(m.type);
}

function frameElementOf(source: MessageEventSource | null) {
  for (const element of document.querySelectorAll<HTMLIFrameElement>(
    `iframe[${FRAME_TOKEN_ATTR}]`
  )) {
    if (element.contentWindow === source) {
      return element;
    }
  }

  return null;
}

function connectFrame(
  element: HTMLIFrameElement,
  token: string,
  target: string
): void {
  const channel = new MessageChannel();
  ports.get(token)?.close();
  ports.set(token, channel.port1);

  channel.port1.addEventListener("message", (event: MessageEvent) => {
    if (!isBridgeMessage(event.data) || event.data.token !== token) {
      return;
    }

    for (const listener of listeners) {
      listener(token, event.data);
    }
  });
  channel.port1.start();

  element.contentWindow?.postMessage(
    { ns: "studio", token: String(token), type: BRIDGE_HANDSHAKE_TYPE },
    target,
    [channel.port2]
  );

  for (const message of pending.get(token) ?? []) {
    channel.port1.postMessage(message);
  }

  pending.delete(token);
}

function helloDocId(data: MessageEvent["data"]): string | null {
  const hello = data as {
    docId?: unknown;
    ns?: unknown;
    type?: unknown;
  } | null;

  if (hello?.ns !== "studio" || hello.type !== BRIDGE_HELLO_TYPE) {
    return null;
  }

  return String(hello.docId ?? "");
}

function onHello(event: MessageEvent): void {
  const docId = helloDocId(event.data);

  if (!docId) {
    return;
  }

  const element = frameElementOf(event.source);

  if (!element) {
    return;
  }

  const token = frameTokenOf(element);

  if (!token || event.origin !== urlOrigin(element.src)) {
    return;
  }

  if (documents.get(token) === docId) {
    return;
  }

  documents.set(token, docId);
  connectFrame(element, token, event.origin);
}

function installHello(): void {
  if (helloInstalled) {
    return;
  }

  helloInstalled = true;
  window.addEventListener("message", onHello);
}

function isCloudBlocked(frame: BridgeFrame, message: BridgeToParent): boolean {
  return (
    frame.cloud === true && CLOUD_BLOCKED_BRIDGE_TYPES.includes(message.type)
  );
}

export function useBridge(
  getFrames: () => BridgeFrame[],
  onMessage: (frame: BridgeFrame, message: BridgeToParent) => void
): void {
  const framesRef = useRef(getFrames);
  framesRef.current = getFrames;
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const listener = (token: string, message: BridgeToParent): void => {
      const frame = framesRef.current().find((f) => f.token === token);

      if (!frame || isCloudBlocked(frame, message)) {
        return;
      }

      handlerRef.current(frame, message);
    };

    listeners.add(listener);

    installHello();

    return () => {
      listeners.delete(listener);
    };
  }, []);
}
