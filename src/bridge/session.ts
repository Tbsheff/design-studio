import { APP_REDIRECT_PARAM } from "../shared/app.js";
import {
  BRIDGE_HANDSHAKE_TYPE,
  BRIDGE_HEADLESS_PARAM,
  BRIDGE_HELLO_TYPE,
  BRIDGE_PARENT_ORIGIN_PARAM,
  BRIDGE_PASSIVE_PARAM,
} from "../shared/contracts.js";
import { appSourceMode } from "./app-source.js";
import { isString } from "./dom-input.js";

const STORAGE_PREFIX = "__studio_bridge:";

interface BridgeSession {
  token: string;
  parentOrigin: string;
  port: MessagePort | null;
}

const storageKey = (): string => `${STORAGE_PREFIX}${window.location.pathname}`;

const rememberOrigin = (parentOrigin: string): void => {
  try {
    window.sessionStorage.setItem(storageKey(), parentOrigin);
  } catch {
    void 0;
  }
};

const APP_MODE = appSourceMode();
const SELECT_RETRIES = 20;
const SELECT_RETRY_MS = 250;

const REDIRECTED_FROM = new URL(window.location.href).searchParams.get(
  APP_REDIRECT_PARAM
);

const stripBridgeParams = (url: URL): void => {
  url.searchParams.delete(BRIDGE_PARENT_ORIGIN_PARAM);
  url.searchParams.delete(APP_REDIRECT_PARAM);

  try {
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash
    );
  } catch {
    void 0;
  }
};

const storedOrigin = (): string | null => {
  try {
    return window.sessionStorage.getItem(storageKey());
  } catch {
    return null;
  }
};

const readParentOrigin = (url: URL): string | null => {
  const parentOrigin = url.searchParams.get(BRIDGE_PARENT_ORIGIN_PARAM);

  if (!parentOrigin) {
    return storedOrigin();
  }

  if (!url.searchParams.has(BRIDGE_PASSIVE_PARAM)) {
    rememberOrigin(parentOrigin);
    stripBridgeParams(url);
  }

  return parentOrigin;
};

const HELLO_RETRIES = 10;
const HELLO_RETRY_MS = 300;
const DOC_ID_RADIX = 36;

interface HandshakeData {
  ns?: unknown;
  token?: unknown;
  type?: unknown;
}

const isHandshake = (event: MessageEvent, parentOrigin: string): boolean => {
  const data = (event.data ?? {}) as HandshakeData;

  if (event.source !== window.parent || event.origin !== parentOrigin) {
    return false;
  }

  return (
    data.ns === "studio" &&
    data.type === BRIDGE_HANDSHAKE_TYPE &&
    isString(data.token) &&
    event.ports.length > 0
  );
};

const awaitHandshake = (
  parentOrigin: string,
  onSession: (session: BridgeSession) => void
): void => {
  const docId = Math.random().toString(DOC_ID_RADIX).slice(2);
  let attempts = 0;
  let timer = 0;

  const onMessage = (event: MessageEvent): void => {
    if (!isHandshake(event, parentOrigin)) {
      return;
    }

    window.clearTimeout(timer);
    window.removeEventListener("message", onMessage);
    onSession({
      parentOrigin,
      port: event.ports[0] ?? null,
      token: String((event.data as HandshakeData).token),
    });
  };

  const hello = (): void => {
    attempts += 1;

    try {
      window.parent.postMessage(
        { docId, ns: "studio", type: BRIDGE_HELLO_TYPE },
        parentOrigin
      );
    } catch {
      void 0;
    }

    if (attempts < HELLO_RETRIES) {
      timer = window.setTimeout(hello, HELLO_RETRY_MS);
    }
  };

  window.addEventListener("message", onMessage);
  hello();
};

const readSession = (onSession: (session: BridgeSession) => void): void => {
  const url = new URL(window.location.href);
  const parentOrigin = readParentOrigin(url);

  if (!parentOrigin) {
    return;
  }

  if (url.searchParams.has(BRIDGE_HEADLESS_PARAM)) {
    onSession({ parentOrigin, port: null, token: "server" });

    return;
  }

  awaitHandshake(parentOrigin, onSession);
};

export {
  APP_MODE,
  REDIRECTED_FROM,
  SELECT_RETRIES,
  SELECT_RETRY_MS,
  readSession,
};

export type { BridgeSession };
