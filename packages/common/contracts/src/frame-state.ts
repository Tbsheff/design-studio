export const FRAME_STATE_KINDS = [
  "default",
  "session",
  "empty",
  "loading",
  "error",
  "mock",
] as const;

export type FrameStateKind = (typeof FRAME_STATE_KINDS)[number];

export const DEFAULT_FRAME_STATE = "default";
export const FRAME_STATE_HEADER = "x-studio-state";
export const FRAME_STATE_ID_HEADER = "x-studio-state-id";
export const FRAME_STATE_ATTR = "data-studio-state";
export const MAX_MOCK_RULES = 40;
export const MAX_CUSTOM_STATES = 12;
export const MAX_MOCK_BODY = 200_000;
export const MAX_RULE_DELAY_MS = 30_000;
export const ID_PATH_SEGMENT = ":id";

const STATE_ID_RE = /^[a-z][a-z0-9-]{0,23}$/;
const HOST_LABEL_PREFIX = "s-";

const PREVIEW_HOST_RE =
  /^(?:s-([a-z][a-z0-9-]{0,23})\.)?(p-[0-9a-f]{2,128}\.localhost)$/;

export interface MockRule {
  path: string;
  method?: string;
  status?: number;
  body?: unknown;
  delayMs?: number;
}

export interface MockUser {
  name: string;
  email: string;
}

export interface FrameStateDef {
  id: string;
  kind: FrameStateKind;
  name: string;
  signedIn: boolean;
  mocks?: MockRule[];
}

export interface FrameSessionInfo {
  user: MockUser;
  usesMockUser: boolean;
  captured: string[];
  capturedAt: number | null;
}

export interface FrameStatesView {
  states: FrameStateDef[];
  frames: Record<string, string>;
  session: FrameSessionInfo;
}

export const DEFAULT_MOCK_USER: MockUser = {
  email: "preview@example.com",
  name: "Preview User",
};

export const BUILT_IN_STATES: readonly FrameStateDef[] = [
  { id: "default", kind: "default", name: "As the app is", signedIn: false },
  { id: "session", kind: "session", name: "Signed in", signedIn: true },
  { id: "empty", kind: "empty", name: "Empty data", signedIn: true },
  { id: "loading", kind: "loading", name: "Loading", signedIn: true },
  { id: "error", kind: "error", name: "Error", signedIn: true },
];

export const STATE_HINTS: Record<FrameStateKind, string> = {
  default: "No change. The frame shows what a new visitor sees.",
  empty:
    "Signed in. /api and tRPC calls in the browser come back with every list empty. A call that fails gets an empty list.",
  error: "Signed in. /api and tRPC calls in the browser get a 500 error.",
  loading:
    "Signed in. /api and tRPC calls in the browser get no answer, so loading UI stays.",
  mock: "Signed in. Calls that match a rule get the mock answer. Other calls go to the app.",
  session:
    "Sends a session cookie and answers the auth session call with the mock user. Cookies the app sets here are kept by the studio, so a real sign-in in this frame sticks.",
};

export function isFrameStateId(value: unknown): value is string {
  return typeof value === "string" && STATE_ID_RE.test(value);
}

export function isFrameStateKind(value: unknown): value is FrameStateKind {
  return (
    typeof value === "string" &&
    (FRAME_STATE_KINDS as readonly string[]).includes(value)
  );
}

export function stateOfHost(
  hostname: string
): { state: string | null; base: string } | null {
  const match = PREVIEW_HOST_RE.exec(hostname.toLowerCase());

  if (!match?.[2]) {
    return null;
  }

  return { base: match[2], state: match[1] ?? null };
}

export function withFrameStateHost(
  url: string,
  stateId: string | null | undefined
): string {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = stateOfHost(parsed.hostname);

  if (!host) {
    return url;
  }

  const wanted =
    stateId && stateId !== DEFAULT_FRAME_STATE && isFrameStateId(stateId)
      ? `${HOST_LABEL_PREFIX}${stateId}.${host.base}`
      : host.base;

  if (wanted === parsed.hostname) {
    return url;
  }

  parsed.hostname = wanted;

  return parsed.toString();
}

export function stateLabel(
  view: FrameStatesView | null,
  stateId: string | undefined
): string | null {
  if (!stateId || stateId === DEFAULT_FRAME_STATE) {
    return null;
  }

  return view?.states.find((state) => state.id === stateId)?.name ?? stateId;
}

export function cleanMockRule(raw: unknown): MockRule | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const rule = raw as Record<string, unknown>;
  const path = typeof rule.path === "string" ? rule.path.trim() : "";

  if (!path.startsWith("/") || path.length > 300 || /\s/.test(path)) {
    return null;
  }

  const out: MockRule = { path };

  if (typeof rule.method === "string" && /^[A-Za-z]{3,7}$/.test(rule.method)) {
    out.method = rule.method.toUpperCase();
  }

  if (
    typeof rule.status === "number" &&
    Number.isInteger(rule.status) &&
    rule.status >= 100 &&
    rule.status <= 599
  ) {
    out.status = rule.status;
  }

  if (rule.body !== undefined) {
    const size = JSON.stringify(rule.body)?.length ?? 0;

    if (size > MAX_MOCK_BODY) {
      return null;
    }

    out.body = rule.body;
  }

  if (typeof rule.delayMs === "number" && rule.delayMs >= 0) {
    out.delayMs = Math.min(Math.round(rule.delayMs), MAX_RULE_DELAY_MS);
  }

  return out;
}

const ID_SEGMENT = ID_PATH_SEGMENT;
const TRPC_SEGMENT = "/trpc/";

function patternOf(rule: MockRule): string {
  return rule.path.split("?")[0] ?? rule.path;
}

function matchesSegments(pattern: string, pathname: string): boolean {
  const want = pattern.split("/");
  const have = pathname.split("/");

  return (
    want.length === have.length &&
    want.every((part, at) =>
      part === ID_SEGMENT ? (have[at] ?? "") !== "" : part === have[at]
    )
  );
}

export function isProcedureRule(rule: MockRule): boolean {
  const pattern = patternOf(rule);

  return (
    pattern.includes(TRPC_SEGMENT) &&
    !pattern.includes(",") &&
    !pattern.includes("*") &&
    !Array.isArray(rule.body)
  );
}

export function mockRuleMatches(
  rule: MockRule,
  method: string,
  pathname: string
): boolean {
  if (rule.method && rule.method !== method.toUpperCase()) {
    return false;
  }

  const pattern = patternOf(rule);

  if (pattern.endsWith("*")) {
    return pathname.startsWith(pattern.slice(0, -1));
  }

  return pattern.includes(ID_SEGMENT)
    ? matchesSegments(pattern, pathname)
    : pathname === pattern;
}
