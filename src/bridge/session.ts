import { APP_REDIRECT_PARAM } from "../shared/app.js";
import {
  BRIDGE_PARENT_ORIGIN_PARAM,
  BRIDGE_PASSIVE_PARAM,
  BRIDGE_TOKEN_PARAM,
} from "../shared/contracts.js";
import { appSourceMode } from "./app-source.js";

const STORAGE_PREFIX = "__studio_bridge:";

interface BridgeSession {
  token: string;
  parentOrigin: string;
}

const storageKey = (): string => `${STORAGE_PREFIX}${window.location.pathname}`;

const isBridgeSession = (value: unknown): value is BridgeSession =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as BridgeSession).token === "string" &&
  typeof (value as BridgeSession).parentOrigin === "string";

const rememberSession = (session: BridgeSession): boolean => {
  try {
    window.sessionStorage.setItem(storageKey(), JSON.stringify(session));

    return true;
  } catch {
    return false;
  }
};

const APP_MODE = appSourceMode();
const SELECT_RETRIES = 20;
const SELECT_RETRY_MS = 250;

const REDIRECTED_FROM = new URL(window.location.href).searchParams.get(
  APP_REDIRECT_PARAM
);

const stripBridgeParams = (url: URL): boolean => {
  url.searchParams.delete(BRIDGE_TOKEN_PARAM);
  url.searchParams.delete(BRIDGE_PARENT_ORIGIN_PARAM);
  url.searchParams.delete(APP_REDIRECT_PARAM);

  try {
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash
    );

    return true;
  } catch {
    return false;
  }
};

const storedSession = (): BridgeSession | null => {
  try {
    const stored = window.sessionStorage.getItem(storageKey());

    if (!stored) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);

    if (isBridgeSession(parsed)) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
};

const readSession = (): BridgeSession | null => {
  const url = new URL(window.location.href);
  const token = url.searchParams.get(BRIDGE_TOKEN_PARAM);
  const parentOrigin = url.searchParams.get(BRIDGE_PARENT_ORIGIN_PARAM);

  if (!token || !parentOrigin) {
    return storedSession();
  }

  const session = { parentOrigin, token };

  if (url.searchParams.has(BRIDGE_PASSIVE_PARAM)) {
    return session;
  }

  rememberSession(session);
  stripBridgeParams(url);

  return session;
};

export {
  APP_MODE,
  REDIRECTED_FROM,
  SELECT_RETRIES,
  SELECT_RETRY_MS,
  readSession,
};

export type { BridgeSession };
