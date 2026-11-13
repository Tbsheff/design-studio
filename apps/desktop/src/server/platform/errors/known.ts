import { BadRequestError } from "./bad-request.js";
import { ConflictError } from "./conflict.js";
import { ForbiddenError } from "./forbidden.js";
import { NotFoundError } from "./not-found.js";

const KNOWN_ERRORS = [
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
];

const hasStatus = (error: unknown): error is Error =>
  error instanceof Error && "status" in error;

const isKnownError = (error: unknown): error is Error =>
  KNOWN_ERRORS.some((known) => error instanceof known) || hasStatus(error);

export { isKnownError };
