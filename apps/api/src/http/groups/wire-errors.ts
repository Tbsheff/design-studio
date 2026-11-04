import { HttpApiSchema } from "effect/http-api";

import { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import {
  FORBIDDEN,
  NOT_FOUND,
  UNAUTHORIZED,
} from "@design-studio/actions/_core/errors/http-status-codes";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Unauthenticated } from "@design-studio/actions/_core/errors/unauthenticated";

const ForbiddenWire = Forbidden.pipe(HttpApiSchema.status(FORBIDDEN));

const NotFoundWire = NotFound.pipe(HttpApiSchema.status(NOT_FOUND));

const UnauthenticatedWire = Unauthenticated.pipe(
  HttpApiSchema.status(UNAUTHORIZED)
);

const MEMBER_ERRORS = [
  ForbiddenWire,
  NotFoundWire,
  UnauthenticatedWire,
] as const;

export { ForbiddenWire, MEMBER_ERRORS, NotFoundWire, UnauthenticatedWire };
