import type { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import type { Gone } from "@design-studio/actions/_core/errors/gone";
import {
  DEFECT,
  FORBIDDEN,
  GONE,
  NOT_FOUND,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
} from "@design-studio/actions/_core/errors/http-status-codes";
import type { HttpStatus } from "@design-studio/actions/_core/errors/http-status-codes";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { RateLimited } from "@design-studio/actions/_core/errors/rate-limited";
import type { Unauthenticated } from "@design-studio/actions/_core/errors/unauthenticated";
import { toWire } from "@design-studio/actions/_core/wire";
import type {
  WireBody,
  WireData,
} from "@design-studio/actions/_core/wire";

type AuthError = Forbidden | Gone | NotFound | RateLimited | Unauthenticated;

type AuthErrorTag = AuthError["_tag"];

const AUTH_STATUS = {
  Forbidden: FORBIDDEN,
  Gone: GONE,
  NotFound: NOT_FOUND,
  RateLimited: TOO_MANY_REQUESTS,
  Unauthenticated: UNAUTHORIZED,
} satisfies Record<AuthErrorTag, HttpStatus>;

const toAuthBody = (error: AuthError): WireBody & WireData => {
  if (error._tag === "Forbidden") {
    return { ...toWire(error), perm: error.perm };
  }

  if (error._tag === "RateLimited") {
    return { ...toWire(error), retryAfter: error.retryAfter };
  }

  return toWire(error);
};

const toAuthHeaders = (error: AuthError): Headers => {
  const headers = new Headers();

  if (error._tag === "RateLimited") {
    headers.set("retry-after", String(Math.ceil(error.retryAfter)));
  }

  return headers;
};

const toAuthResponse = (error: AuthError): Response =>
  Response.json(toAuthBody(error), {
    headers: toAuthHeaders(error),
    status: AUTH_STATUS[error._tag],
  });

const toDefectResponse = (): Response =>
  Response.json(toWire(null), { status: DEFECT });

export { AUTH_STATUS, toAuthResponse, toDefectResponse };

export type { AuthError, AuthErrorTag };
