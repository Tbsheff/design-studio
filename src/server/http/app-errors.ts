import type { ContentfulStatusCode } from "hono/utils/http-status";

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  PickAppError,
} from "../platform/errors/index.js";

interface ErrorBody {
  readonly _tag?: string;
  readonly candidates?: PickAppError["candidates"];
  readonly code?: string;
  readonly error: string;
  readonly message?: string;
}

interface TaggedError extends Error {
  readonly _tag: string;
}

interface ErrorReply {
  readonly body: ErrorBody;
  readonly status: ContentfulStatusCode;
}

const BAD_REQUEST: ContentfulStatusCode = 400;
const UNAUTHORIZED: ContentfulStatusCode = 401;
const FORBIDDEN: ContentfulStatusCode = 403;
const NOT_FOUND: ContentfulStatusCode = 404;
const CONFLICT: ContentfulStatusCode = 409;
const DEFECT: ContentfulStatusCode = 500;

const TAG_STATUS = new Map<string, ContentfulStatusCode>([
  ["BadRequest", BAD_REQUEST],
  ["Conflict", CONFLICT],
  ["Forbidden", FORBIDDEN],
  ["NotFound", NOT_FOUND],
  ["PickApp", CONFLICT],
  ["Unauthorized", UNAUTHORIZED],
]);

const statusOfClass = (error: Error): ContentfulStatusCode => {
  if (error instanceof NotFoundError) {
    return NOT_FOUND;
  }

  if (error instanceof BadRequestError) {
    return BAD_REQUEST;
  }

  if (error instanceof ConflictError) {
    return CONFLICT;
  }

  return DEFECT;
};

const statusOfTag = (tag: string, error: Error): ContentfulStatusCode =>
  TAG_STATUS.get(tag) ??
  TAG_STATUS.get(tag.replace(/Error$/u, "")) ??
  statusOfClass(error);

const isTaggedError = (error: Error): error is TaggedError => "_tag" in error;

const toPickAppReply = (error: PickAppError): ErrorReply => ({
  body: {
    candidates: error.candidates,
    code: "pick_app",
    error: error.message,
  },
  status: CONFLICT,
});

const toErrorReply = (error: Error): ErrorReply => {
  if (error instanceof PickAppError) {
    return toPickAppReply(error);
  }

  if (!isTaggedError(error)) {
    return { body: { error: error.message }, status: statusOfClass(error) };
  }

  return {
    body: { _tag: error._tag, error: error.message, message: error.message },
    status: statusOfTag(error._tag, error),
  };
};

export { toErrorReply };

export type { ErrorReply };
