import type { Route } from "playwright-core";

import { checkUrl, FetchBlockedError, safeRequest } from "./deps.js";
import type { FetchPolicy, PassThroughResponse } from "./deps.js";
import { quietly } from "./quiet.js";

const MAX_REQUESTS = 300;

const MAX_REFUSED = 50;

const URL_TEXT_MAX = 160;

const OK_STATUS = 200;

const REQUEST_MS = 10_000;

const PER_REQUEST_BYTES = 6_291_456;

const TOTAL_BYTES = 41_943_040;

const KEEP_TYPES = new Set(["image", "font"]);

const SKIPPED_TYPES = new Set([
  "media",
  "texttrack",
  "eventsource",
  "websocket",
  "manifest",
]);

const METHODS = new Set(["GET", "HEAD"]);

const DROP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
  "cookie",
]);

const DROP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "set-cookie",
]);

interface RequestGuard {
  readonly kept: Map<string, Buffer>;
  readonly refused: string[];
  readonly handle: (route: Route) => Promise<void>;
  readonly close: () => void;
  readonly mainStatus: () => number;
}

interface GuardState {
  count: number;
  closed: boolean;
  status: number;
  readonly allowLoopback: boolean;
  readonly kept: Map<string, Buffer>;
  readonly refused: string[];
  readonly policy: FetchPolicy;
}

const toAbort = async (route: Route): Promise<void> => {
  await quietly(route.abort("blockedbyclient"));
};

const toHeadersOf = async (route: Route): Promise<Record<string, string>> => {
  const raw = await route.request().allHeaders();

  return Object.fromEntries(
    Object.entries(raw).filter(
      ([name]) =>
        !name.startsWith(":") && !DROP_REQUEST_HEADERS.has(name.toLowerCase())
    )
  );
};

const toFulfill = async (
  route: Route,
  response: PassThroughResponse
): Promise<void> => {
  const kept = Object.fromEntries(
    Object.entries(response.headers).filter(
      ([name]) => !DROP_RESPONSE_HEADERS.has(name.toLowerCase())
    )
  );

  await quietly(
    route.fulfill({
      body: response.body,
      headers: kept,
      status: response.status,
    })
  );
};

const toUrlProblem = (url: string, allowLoopback: boolean): string | null => {
  try {
    checkUrl(url, allowLoopback);

    return null;
  } catch (error) {
    return String(error);
  }
};

const toRefusalOf = (route: Route, state: GuardState): string | null => {
  const request = route.request();

  if (state.closed) {
    return "closed";
  }

  if (SKIPPED_TYPES.has(request.resourceType())) {
    return "skipped type";
  }

  if (!METHODS.has(request.method())) {
    return `method ${request.method()} is not allowed`;
  }

  if (state.count >= MAX_REQUESTS) {
    return `more than ${MAX_REQUESTS} requests`;
  }

  return toUrlProblem(request.url(), state.allowLoopback);
};

const toNoteRefused = (state: GuardState, url: string, why: string): void => {
  if (state.refused.length < MAX_REFUSED) {
    state.refused.push(`${url.slice(0, URL_TEXT_MAX)}: ${why}`);
  }
};

const toPass = async (route: Route, state: GuardState): Promise<void> => {
  const request = route.request();
  const url = request.url();

  try {
    const response = await safeRequest(
      url,
      { headers: await toHeadersOf(route), method: request.method() },
      state.policy
    );

    if (request.isNavigationRequest() && state.status === 0) {
      state.status = response.status;
    }

    if (
      KEEP_TYPES.has(request.resourceType()) &&
      response.status === OK_STATUS
    ) {
      state.kept.set(url, response.body);
    }

    await toFulfill(route, response);
  } catch (error) {
    if (error instanceof FetchBlockedError) {
      toNoteRefused(state, url, error.message);
    }

    await toAbort(route);
  }
};

const toHandleRoute = (route: Route, state: GuardState): Promise<void> => {
  const why = toRefusalOf(route, state);

  if (why !== null) {
    toNoteRefused(state, route.request().url(), why);

    return toAbort(route);
  }

  state.count += 1;

  return toPass(route, state);
};

const createRequestGuard = (
  isLoopbackAllowed: boolean,
  until: number
): RequestGuard => {
  const state: GuardState = {
    allowLoopback: isLoopbackAllowed,
    closed: false,
    count: 0,
    kept: new Map(),
    policy: {
      allowLoopback: isLoopbackAllowed,
      budget: { limit: TOTAL_BYTES, used: 0 },
      deadline: until,
      maxBytes: PER_REQUEST_BYTES,
      maxRedirects: 0,
      timeoutMs: REQUEST_MS,
    },
    refused: [],
    status: 0,
  };

  return {
    close: () => {
      state.closed = true;
    },
    handle: (route) => toHandleRoute(route, state),
    kept: state.kept,
    mainStatus: () => state.status,
    refused: state.refused,
  };
};

export { createRequestGuard };

export type { RequestGuard };
