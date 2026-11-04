import type http from "node:http";

import {
  FRAME_STATE_HEADER,
  FRAME_STATE_ID_HEADER,
  isProcedureRule,
  mockRuleMatches,
  type MockRule,
} from "@design-studio/contracts/frame-state";

import {
  applyRecording,
  applySplice,
  isBatchCall,
  isJsonOk,
  plans,
  toProcedures,
} from "./frame-state-calls.js";
import {
  applyProcedureReply,
  isDataPath,
  toCallPlan,
  toErrorBody,
} from "./frame-state-plan.js";
import {
  captureCookies,
  hasSessionCookie,
  type ResolvedFrameState,
} from "./frame-state.js";

const MOCK_SESSION_VALUE = "studio-preview-session";

const BASE_SESSION_COOKIES = [
  "authjs.session-token",
  "authjs.session_token",
  "auth.session_token",
  "next-auth.session-token",
  "better-auth.session_token",
  "__session",
  "auth_session",
];

const LOADING_HOLD_MS = 120_000;
const MAX_EMPTY_BODY = 5 * 1024 * 1024;

export interface ActiveFrameState {
  resolved: ResolvedFrameState;
  env: Record<string, string> | undefined;
}

export function sessionCookieNames(
  env: Record<string, string> | undefined
): string[] {
  const prefix = env?.AUTH_COOKIE_PREFIX?.trim();

  const extra =
    prefix && /^[\w.-]{1,40}$/.test(prefix)
      ? [`${prefix}.session-token`, `${prefix}.session_token`]
      : [];

  return [...new Set([...BASE_SESSION_COOKIES, ...extra])];
}

function parseCookieHeader(header: string | undefined): Map<string, string> {
  const map = new Map<string, string>();

  for (const part of (header ?? "").split(";")) {
    const at = part.indexOf("=");

    if (at > 0) {
      map.set(part.slice(0, at).trim(), part.slice(at + 1).trim());
    }
  }

  return map;
}

function usesCapturedSession(state: ActiveFrameState): boolean {
  return (
    state.resolved.def.signedIn &&
    hasSessionCookie(state.resolved.jar, sessionCookieNames(state.env))
  );
}

function upstreamCookie(
  existing: string | undefined,
  state: ActiveFrameState
): string | undefined {
  if (!state.resolved.def.signedIn) {
    return existing;
  }

  const cookies = parseCookieHeader(existing);

  if (!usesCapturedSession(state)) {
    for (const name of sessionCookieNames(state.env)) {
      if (!cookies.has(name)) {
        cookies.set(name, MOCK_SESSION_VALUE);
      }
    }
  }

  for (const [name, value] of Object.entries(state.resolved.jar)) {
    cookies.set(name, value);
  }

  return cookies.size === 0
    ? undefined
    : [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

export function withStateHeaders(
  headers: http.OutgoingHttpHeaders,
  state: ActiveFrameState | null
): http.OutgoingHttpHeaders {
  if (!state) {
    return headers;
  }

  const cookie = upstreamCookie(
    typeof headers.cookie === "string" ? headers.cookie : undefined,
    state
  );

  const next: http.OutgoingHttpHeaders = {
    ...headers,
    [FRAME_STATE_HEADER]: state.resolved.def.kind,
    [FRAME_STATE_ID_HEADER]: state.resolved.def.id,
  };

  if (cookie) {
    next.cookie = cookie;
  } else {
    delete next.cookie;
  }

  return next;
}

function pathOf(req: http.IncomingMessage): string {
  return (req.url ?? "/").split("?")[0] ?? "/";
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown
): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-studio-mock": "1",
  });
  res.end(JSON.stringify(body));
}

function mockUserBodies(state: ActiveFrameState): Record<string, unknown> {
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 864e5).toISOString();

  const user = {
    id: "studio-preview-user",
    name: state.resolved.session.user.name,
    email: state.resolved.session.user.email,
    emailVerified: true,
    image: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const session = {
    id: "studio-preview-session",
    userId: user.id,
    token: MOCK_SESSION_VALUE,
    expiresAt: expires,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  return {
    "/api/auth/get-session": { session, user },
    "/api/auth/session": {
      user: { name: user.name, email: user.email, image: null },
      expires,
    },
  };
}

function authMock(
  state: ActiveFrameState,
  method: string,
  pathname: string
): unknown {
  if (
    !state.resolved.def.signedIn ||
    usesCapturedSession(state) ||
    method !== "GET"
  ) {
    return undefined;
  }

  return mockUserBodies(state)[pathname];
}

function findMock(
  rules: MockRule[] | undefined,
  method: string,
  pathname: string
): MockRule | null {
  return (
    rules?.find(
      (rule) =>
        !isProcedureRule(rule) && mockRuleMatches(rule, method, pathname)
    ) ?? null
  );
}

function holdOpen(req: http.IncomingMessage, res: http.ServerResponse): void {
  const timer = setTimeout(
    () =>
      sendJson(res, 504, {
        error: "Design Studio loading state ended after 2 minutes.",
      }),
    LOADING_HOLD_MS
  );

  timer.unref();
  const clear = (): void => clearTimeout(timer);
  res.once("close", clear);
  req.once("aborted", clear);
}

function answerMock(res: http.ServerResponse, rule: MockRule): void {
  const reply = (): void =>
    sendJson(res, rule.status ?? 200, rule.body ?? null);

  if (rule.delayMs) {
    setTimeout(reply, rule.delayMs).unref();
  } else {
    reply();
  }
}

export function answerState(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  state: ActiveFrameState,
  isDocument: boolean
): boolean {
  const method = (req.method ?? "GET").toUpperCase();
  const pathname = pathOf(req);
  const auth = authMock(state, method, pathname);

  if (auth !== undefined) {
    sendJson(res, 200, auth);

    return true;
  }

  if (isDocument) {
    return false;
  }

  const rule = findMock(state.resolved.def.mocks, method, pathname);

  if (rule) {
    answerMock(res, rule);

    return true;
  }

  if (applyProcedureReply(req, res, state)) {
    return true;
  }

  if (!isDataPath(pathname)) {
    return false;
  }

  if (state.resolved.def.kind === "loading") {
    holdOpen(req, res);

    return true;
  }

  if (state.resolved.def.kind === "error") {
    sendJson(res, 500, toErrorBody(req));

    return true;
  }

  return false;
}

export function captureSessionCookies(
  state: ActiveFrameState | null,
  headers: http.OutgoingHttpHeaders
): void {
  if (!state?.resolved.def.signedIn) {
    return;
  }

  const raw = headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  delete headers["set-cookie"];
  void captureCookies(state.resolved.projectDir, list).catch((error: unknown) =>
    console.error("[frame-state] session capture failed", error)
  );
}

export function wantsEmpty(
  state: ActiveFrameState | null,
  req: http.IncomingMessage
): boolean {
  const plan = toCallPlan(state, req);

  if (plan) {
    plans.set(req, plan);
  }

  return plan !== null;
}

function syntheticEmpty(req: http.IncomingMessage, pathname: string): unknown {
  const procedures = toProcedures(pathname);

  if (!procedures) {
    return [];
  }

  const one = () => ({ result: { data: { json: [] } } });

  return isBatchCall(req.url ?? "", procedures.length)
    ? procedures.map(one)
    : one();
}

function emptyArrays(value: unknown, depth: number): unknown {
  if (depth > 40) {
    return value;
  }

  if (Array.isArray(value)) {
    return [];
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      emptyArrays(item, depth + 1),
    ])
  );
}

function emptyTrpc(value: unknown): unknown {
  const one = (item: unknown): unknown => {
    if (!item || typeof item !== "object" || !("result" in item)) {
      return item;
    }

    const result = (item as { result: { data?: unknown } }).result;

    return {
      ...item,
      result: { ...result, data: emptyArrays(result?.data, 0) },
    };
  };

  return Array.isArray(value) ? value.map(one) : one(value);
}

export function sendEmptied(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  upstreamRes: http.IncomingMessage,
  status: number,
  headers: http.OutgoingHttpHeaders
): void {
  const plan = plans.get(req);

  const reply = { headers, req, res, status, upstreamRes };

  if (plan?.mode === "record") {
    applyRecording(reply, plan.recorder);

    return;
  }

  if (plan?.mode === "splice") {
    applySplice(reply, plan);

    return;
  }

  if (!isJsonOk(status, upstreamRes)) {
    upstreamRes.resume();
    sendJson(res, 200, syntheticEmpty(req, pathOf(req)));

    return;
  }

  const chunks: Buffer[] = [];
  let size = 0;
  upstreamRes.on("data", (chunk: Buffer) => {
    size += chunk.length;
    chunks.push(chunk);
  });
  upstreamRes.on("end", () => {
    const text = Buffer.concat(chunks).toString("utf-8");
    let body = text;

    try {
      if (size <= MAX_EMPTY_BODY) {
        const parsed: unknown = JSON.parse(text);
        body = JSON.stringify(
          toProcedures(pathOf(req)) ? emptyTrpc(parsed) : emptyArrays(parsed, 0)
        );
      }
    } catch {
      body = text;
    }

    res.writeHead(status, { ...headers, "x-studio-mock": "1" });
    res.end(body);
  });
  upstreamRes.on("error", () => res.destroy());
}
