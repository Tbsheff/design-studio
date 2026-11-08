import {
  BRIDGE_HANDSHAKE_TYPE,
  BRIDGE_HELLO_TYPE,
  BRIDGE_PARENT_ORIGIN_PARAM,
  CLOUD_BLOCKED_BRIDGE_TYPES,
} from "@design-studio/contracts";
import type {
  BridgeToParent,
  ParentToBridge,
  ProjectKind,
} from "@design-studio/contracts";
import { useEffect, useRef } from "react";

interface BridgeFrame {
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

const HTML_FRAME_SANDBOX = "allow-scripts allow-same-origin allow-forms";

type ParentMessageBody = ParentToBridge extends infer Message
  ? Message extends ParentToBridge
    ? Omit<Message, "ns" | "token">
    : never
  : never;

interface PreviewPort {
  post: (body: ParentMessageBody) => void;
  refreshRects: () => void;
  listen?: (handler: (message: BridgeToParent) => void) => () => void;
}

const urlOrigin = (url: string): string => {
  try {
    return new URL(url, globalThis.location.href).origin;
  } catch {
    return "";
  }
};

const frameOrigin = (frame: Pick<BridgeFrame, "url">): string =>
  urlOrigin(frame.url);

const tagFrame = (
  element: HTMLIFrameElement | null,
  token: string
): HTMLIFrameElement | null => {
  element?.setAttribute(FRAME_TOKEN_ATTR, token);

  return element;
};

const frameTokenOf = (element: HTMLIFrameElement): string | null =>
  element.getAttribute(FRAME_TOKEN_ATTR);

const frameSrc = (
  previewUrl: string,
  extra?: Record<string, string>
): string => {
  const url = new URL(previewUrl, globalThis.location.href);
  url.searchParams.set(BRIDGE_PARENT_ORIGIN_PARAM, globalThis.location.origin);

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
};

const postToFrame = (frame: BridgeFrame, body: ParentMessageBody): void => {
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
};

const isBridgeMessage = (data: unknown): data is BridgeToParent => {
  if (!data || typeof data !== "object") {
    return false;
  }

  const message = data as { ns?: unknown; token?: unknown; type?: unknown };

  return (
    message.ns === "studio" && Boolean(message.token) && Boolean(message.type)
  );
};

const frameElementOf = (
  source: MessageEventSource | null
): HTMLIFrameElement | null => {
  for (const element of document.querySelectorAll<HTMLIFrameElement>(
    `iframe[${FRAME_TOKEN_ATTR}]`
  )) {
    if (element.contentWindow === source) {
      return element;
    }
  }

  return null;
};

const connectFrame = (
  element: HTMLIFrameElement,
  token: string,
  target: string
): void => {
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
};

const helloDocId = (data: MessageEvent["data"]): string | null => {
  const hello = data as {
    docId?: unknown;
    ns?: unknown;
    type?: unknown;
  } | null;

  if (hello?.ns !== "studio" || hello.type !== BRIDGE_HELLO_TYPE) {
    return null;
  }

  return String(hello.docId ?? "");
};

const onHello = (event: MessageEvent): void => {
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
};

const installHello = (): void => {
  if (helloInstalled) {
    return;
  }

  helloInstalled = true;
  window.addEventListener("message", onHello);
};

const isCloudBlocked = (frame: BridgeFrame, message: BridgeToParent): boolean =>
  frame.cloud === true && CLOUD_BLOCKED_BRIDGE_TYPES.includes(message.type);

const useBridge = (
  getFrames: () => BridgeFrame[],
  onMessage: (frame: BridgeFrame, message: BridgeToParent) => void
): void => {
  const framesRef = useRef(getFrames);
  framesRef.current = getFrames;
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const listener = (token: string, message: BridgeToParent): void => {
      const frame = framesRef
        .current()
        .find((frameValue) => frameValue.token === token);

      if (!frame || isCloudBlocked(frame, message)) {
        return;
      }

      handlerRef.current(frame, message);
    };

    listeners.add(listener);

    installHello();

    return (): void => {
      listeners.delete(listener);
    };
  }, []);
};

export {
  HTML_FRAME_SANDBOX,
  tagFrame,
  frameTokenOf,
  frameSrc,
  postToFrame,
  useBridge,
};

export type { BridgeFrame, ParentMessageBody, PreviewPort };
