import type { ApiErrorBody } from "./protocol";

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  PUBLISH_KEY_HASH: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly headers: Record<string, string> = {}
  ) {
    super(message);
  }
}

export const bad = (message: string, code = "bad_request") =>
  new ApiError(400, code, message);
export const notFound = (message = "Not found.") =>
  new ApiError(404, "not_found", message);

const API_HEADERS: Record<string, string> = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
};

export function json(
  value: unknown,
  status = 200,
  extra: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...API_HEADERS,
      ...extra,
    },
  });
}

export function apiFailure(error: unknown): Response {
  if (error instanceof ApiError)
    return json(
      { error: error.message, code: error.code } satisfies ApiErrorBody,
      error.status,
      error.headers
    );
  console.error(
    "publish api error",
    error instanceof Error ? error.stack : String(error)
  );
  return json(
    {
      error: "The publish Worker hit an error.",
      code: "internal",
    } satisfies ApiErrorBody,
    500
  );
}

export async function readJson<T>(
  request: Request,
  maxBytes = 1024 * 1024
): Promise<T> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > maxBytes)
    throw new ApiError(413, "too_large", "The request body is too large.");
  const text = await request.text();
  if (text.length > maxBytes)
    throw new ApiError(413, "too_large", "The request body is too large.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw bad("The request body is not valid JSON.");
  }
}

export const PAGE_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

const SITE_CSP = [
  "default-src SELF",
  "script-src SELF 'unsafe-inline' https:",
  "style-src SELF 'unsafe-inline' https:",
  "img-src SELF data: blob: https:",
  "font-src SELF data: https:",
  "media-src SELF data: blob: https:",
  "connect-src SELF https:",
  "frame-src SELF https:",
  "object-src 'none'",
  "base-uri SELF",
  "form-action SELF",
  "frame-ancestors 'none'",
  "sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads",
].join("; ");

const VIEWER_CSP = [
  "default-src 'none'",
  "img-src SELF data:",
  "style-src SELF",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export function designCsp(kind: string, self: string): string {
  return (kind === "site" ? SITE_CSP : VIEWER_CSP).replaceAll("SELF", self);
}

export interface SecureOptions {
  csp: string;
  noindex: boolean;
}

export function secure(response: Response, options: SecureOptions): Response {
  const headers = new Headers(response.headers);
  headers.set("content-security-policy", options.csp);
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
  if (options.noindex)
    headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function clientKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}
