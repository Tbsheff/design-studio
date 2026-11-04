import type { Forbidden } from "../../../../src/shared/actions/_core/errors/forbidden.js";
import type { Gone } from "../../../../src/shared/actions/_core/errors/gone.js";
import {
  DEFECT,
  FORBIDDEN,
  GONE,
  NOT_FOUND,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
} from "../../../../src/shared/actions/_core/errors/http-status-codes.js";
import type { HttpStatus } from "../../../../src/shared/actions/_core/errors/http-status-codes.js";
import type { NotFound } from "../../../../src/shared/actions/_core/errors/not-found.js";
import type { RateLimited } from "../../../../src/shared/actions/_core/errors/rate-limited.js";
import type { Unauthenticated } from "../../../../src/shared/actions/_core/errors/unauthenticated.js";
import { toWire } from "../../../../src/shared/actions/_core/wire.js";
import type {
  WireBody,
  WireData,
} from "../../../../src/shared/actions/_core/wire.js";

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
